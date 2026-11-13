// What a developer can connect: an API key from Anthropic, OpenAI or Gemini, or a Claude subscription
// through Claude Code. Each does two things: run an audit that reads the code until it hands in its answer,
// and write one JSON answer to a schema.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fail, postJson } from "./http.ts";

export type Provider = "anthropic" | "openai" | "gemini" | "claude-code";
export type Effort = "medium" | "high";

export interface Tool {
	name: string;
	description: string;
	schema: Record<string, unknown>;
}

/** What a read tool returned to the model. */
export interface Outcome { output: string; error?: boolean }
export type Handler = (name: string, input: unknown) => Promise<Outcome>;

export interface Agent {
	system: string;
	user: string;
	/** Tools that read the code, answered by `handle`. */
	tools: Tool[];
	handle: Handler;
	/** The tool the model hands its answer in with; its schema is the answer's. */
	answer: Tool;
	/** Said to the model when it stops without answering. */
	finish: string;
	maxTurns: number;
	/** The head commit checked out on disk, for a model that reads it with tools of its own. */
	root: () => string;
}

export interface Usage { input: number; output: number }

export interface Model {
	provider: Provider;
	/** The model as the review's credit line names it. */
	id: string;
	/** Tokens used so far, for the log: what this review cost is the developer's to know. */
	usage: Usage;
	/** Read the code with tools until the model hands in its answer. */
	loop(agent: Agent): Promise<unknown>;
	json(system: string, user: string, schema: Record<string, unknown>, effort: Effort): Promise<unknown>;
}

/** The default model for each provider; Claude Code's empty default lets the subscription's plan choose. */
export const DEFAULT_MODEL: Record<Provider, string> = {
	anthropic: "claude-opus-5-5",
	openai: "gpt-6.1-sol",
	gemini: "gemini-4-argon",
	"claude-code": "",
};

export function providerOf(model: string): Provider | undefined {
	if (model.startsWith("claude-")) return "anthropic";
	if (/^(gpt-|o\d)/.test(model)) return "openai";
	if (model.startsWith("gemini-")) return "gemini";
	return undefined;
}

export function model(provider: Provider, id: string, key: string): Model {
	if (provider === "anthropic") return anthropic(id, key);
	if (provider === "openai") return openai(id, key);
	if (provider === "claude-code") return claudeCode(id, key);
	return gemini(id, key);
}

const MAX_TOKENS = 32000;

// ------------------------------------------------------------------ Anthropic, Messages API

interface AnthropicBlock { type: string; id?: string; name?: string; input?: unknown; text?: string }
interface AnthropicMessage { content: AnthropicBlock[]; stop_reason: string; stop_details?: { category?: string | null } | null; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }

// Models that take a server-side fallback when a safety classifier declines: security-heavy diffs can trip one.
const FALLBACKS = new Set(["claude-fable-5-2", "claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

function anthropic(id: string, key: string): Model {
	const usage: Usage = { input: 0, output: 0 };
	const headers: Record<string, string> = { "x-api-key": key, "anthropic-version": "2026-10-21" };
	if (FALLBACKS.has(id)) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
	async function call(body: Record<string, unknown>): Promise<AnthropicMessage> {
		const reply = await postJson("https://api.anthropic.com/v1/messages", headers, {
			model: id, max_tokens: MAX_TOKENS, cache_control: { type: "ephemeral" }, ...(FALLBACKS.has(id) ? { fallbacks: "default" } : {}), ...body,
		});
		if (reply.status !== 200) fail("Anthropic", reply);
		const message = reply.body as AnthropicMessage;
		const u = message.usage ?? {};
		usage.input += (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
		usage.output += u.output_tokens ?? 0;
		if (message.stop_reason === "refusal") throw new Error(`${id} declined to review this (${message.stop_details?.category ?? "no category given"}).`);
		if (message.stop_reason === "max_tokens") throw new Error(`${id} ran out of room before finishing (max_tokens).`);
		return message;
	}
	return {
		provider: "anthropic",
		id,
		usage,
		async loop(a) {
			const defs = [...a.tools, a.answer].map((t) => ({ name: t.name, description: t.description, input_schema: t.schema, strict: true }));
			const messages: { role: string; content: unknown }[] = [{ role: "user", content: a.user }];
			for (let turn = 0; turn < a.maxTurns; turn++) {
				const message = await call({ system: a.system, messages, tools: defs, output_config: { effort: "high" } });
				messages.push({ role: "assistant", content: message.content });
				const calls = message.content.filter((b) => b.type === "tool_use");
				const answer = calls.find((c) => c.name === a.answer.name);
				if (answer) return answer.input;
				if (calls.length === 0) { messages.push({ role: "user", content: a.finish }); continue; }
				const results = [];
				for (const c of calls) {
					const outcome = await a.handle(c.name ?? "", c.input);
					results.push({ type: "tool_result", tool_use_id: c.id, content: outcome.output, ...(outcome.error ? { is_error: true } : {}) });
				}
				if (turn === a.maxTurns - 2) results.push({ type: "text", text: a.finish });
				messages.push({ role: "user", content: results });
			}
			throw new Error(`${id} did not finish the audit in ${a.maxTurns} turns.`);
		},
		async json(system, user, schema, effort) {
			const message = await call({ system, messages: [{ role: "user", content: user }], output_config: { effort, format: { type: "json_schema", schema } } });
			return JSON.parse(message.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
		},
	};
}

// ------------------------------------------------------------------ OpenAI, Responses API

interface OpenAIItem { type: string; call_id?: string; name?: string; arguments?: string; content?: { type: string; text?: string }[] }
interface OpenAIResponse { id: string; status: string; output: OpenAIItem[]; incomplete_details?: { reason?: string } | null; usage?: { input_tokens?: number; output_tokens?: number } }

function openai(id: string, key: string): Model {
	const usage: Usage = { input: 0, output: 0 };
	async function call(body: Record<string, unknown>): Promise<OpenAIResponse> {
		const reply = await postJson("https://api.openai.com/v1/responses", { authorization: `Bearer ${key}` }, { model: id, max_output_tokens: MAX_TOKENS, ...body });
		if (reply.status !== 200) fail("OpenAI", reply);
		const response = reply.body as OpenAIResponse;
		usage.input += response.usage?.input_tokens ?? 0;
		usage.output += response.usage?.output_tokens ?? 0;
		if (response.status === "incomplete") throw new Error(`${id} stopped early (${response.incomplete_details?.reason ?? "incomplete"}).`);
		return response;
	}
	const text = (r: OpenAIResponse) => r.output.filter((o) => o.type === "message").flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
	return {
		provider: "openai",
		id,
		usage,
		async loop(a) {
			const defs = [...a.tools, a.answer].map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.schema, strict: true }));
			let input: unknown[] = [{ role: "user", content: a.user }];
			let previous: string | undefined;
			for (let turn = 0; turn < a.maxTurns; turn++) {
				const response = await call({ instructions: a.system, input, tools: defs, reasoning: { effort: "high" }, ...(previous ? { previous_response_id: previous } : {}) });
				previous = response.id;
				const calls = response.output.filter((o) => o.type === "function_call");
				if (calls.length === 0) { input = [{ role: "user", content: a.finish }]; continue; }
				input = [];
				for (const c of calls) {
					let args: unknown;
					try { args = JSON.parse(c.arguments ?? "{}"); } catch { input.push({ type: "function_call_output", call_id: c.call_id, output: "The arguments were not valid JSON." }); continue; }
					if (c.name === a.answer.name) return args;
					const outcome = await a.handle(c.name ?? "", args);
					input.push({ type: "function_call_output", call_id: c.call_id, output: outcome.output });
				}
				if (turn === a.maxTurns - 2) input.push({ role: "user", content: a.finish });
			}
			throw new Error(`${id} did not finish the audit in ${a.maxTurns} turns.`);
		},
		async json(system, user, schema, effort) {
			const response = await call({ instructions: system, input: [{ role: "user", content: user }], reasoning: { effort }, text: { format: { type: "json_schema", name: "review", schema, strict: true } } });
			return JSON.parse(text(response));
		},
	};
}

// ------------------------------------------------------------------ Gemini, generateContent

interface GeminiPart { text?: string; thought?: boolean; functionCall?: { name: string; args?: unknown; id?: string }; functionResponse?: unknown }
interface GeminiContent { role: string; parts: GeminiPart[] }
interface GeminiResponse { candidates?: { content?: GeminiContent; finishReason?: string }[]; promptFeedback?: { blockReason?: string }; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } }

function gemini(id: string, key: string): Model {
	const usage: Usage = { input: 0, output: 0 };
	async function call(body: Record<string, unknown>): Promise<GeminiContent> {
		const reply = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`, { "x-goog-api-key": key }, body);
		if (reply.status !== 200) fail("Gemini", reply);
		const response = reply.body as GeminiResponse;
		usage.input += response.usageMetadata?.promptTokenCount ?? 0;
		usage.output += (response.usageMetadata?.candidatesTokenCount ?? 0) + (response.usageMetadata?.thoughtsTokenCount ?? 0);
		const candidate = response.candidates?.[0];
		if (!candidate?.content) throw new Error(`${id} gave no answer (${response.promptFeedback?.blockReason ?? candidate?.finishReason ?? "empty"}).`);
		if (candidate.finishReason === "MAX_TOKENS") throw new Error(`${id} ran out of room before finishing (MAX_TOKENS).`);
		return candidate.content;
	}
	const config = (effort: Effort) => ({ maxOutputTokens: MAX_TOKENS, thinkingConfig: { thinkingLevel: effort } });
	return {
		provider: "gemini",
		id,
		usage,
		async loop(a) {
			const defs = [{ functionDeclarations: [...a.tools, a.answer].map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.schema })) }];
			const contents: GeminiContent[] = [{ role: "user", parts: [{ text: a.user }] }];
			for (let turn = 0; turn < a.maxTurns; turn++) {
				// The model's turn goes back exactly as it came: its parts carry the thought signatures Gemini needs.
				const content = await call({ systemInstruction: { parts: [{ text: a.system }] }, contents, tools: defs, generationConfig: config("high") });
				contents.push(content);
				const calls = content.parts.filter((p) => p.functionCall).map((p) => p.functionCall!);
				const answer = calls.find((c) => c.name === a.answer.name);
				if (answer) return answer.args ?? {};
				if (calls.length === 0) { contents.push({ role: "user", parts: [{ text: a.finish }] }); continue; }
				const parts: GeminiPart[] = [];
				for (const fc of calls) {
					const outcome = await a.handle(fc.name, fc.args ?? {});
					parts.push({ functionResponse: { name: fc.name, ...(fc.id ? { id: fc.id } : {}), response: { output: outcome.output } } });
				}
				if (turn === a.maxTurns - 2) parts.push({ text: a.finish });
				contents.push({ role: "user", parts });
			}
			throw new Error(`${id} did not finish the audit in ${a.maxTurns} turns.`);
		},
		async json(system, user, schema, effort) {
			const content = await call({
				systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }],
				generationConfig: { ...config(effort), responseMimeType: "application/json", responseJsonSchema: schema },
			});
			return JSON.parse(content.parts.filter((p) => p.text && !p.thought).map((p) => p.text).join(""));
		},
	};
}

// ------------------------------------------------------------------ Claude Code, on a Claude subscription

// A Claude Pro or Max subscription reaches Claude only through Claude Code, so this runs the Claude Code CLI
// headless. Restricted mode removes every tool that runs code and ignores the repository's own settings, and
// only Read, Grep and Glob are given: the pull request's code is read, never run.
const CLAUDE_CODE = "@anthropic-ai/claude-code@2.1.323";

interface ClaudeCodeResult { is_error?: boolean; subtype?: string; result?: string; structured_output?: unknown; modelUsage?: Record<string, unknown>; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }

function claudeCode(id: string, token: string): Model {
	const usage: Usage = { input: 0, output: 0 };
	function run(cwd: string, system: string, user: string, schema: Record<string, unknown>, tools: string, effort: Effort): Promise<unknown> {
		const dir = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "silvertongue-prompt-"));
		writeFileSync(join(dir, "system.md"), system);
		const args = ["-y", CLAUDE_CODE, "-p", "--system-prompt-file", join(dir, "system.md"), "--tools", tools, "--restricted", "--strict-mcp-config",
			"--permission-prompts", "none", "--no-session-persistence", "--output-format", "json", "--json-schema", JSON.stringify(schema), "--effort", effort, ...(id ? ["--model", id] : [])];
		const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token, GIT_LFS_SKIP_SMUDGE: "1" };
		delete env.ANTHROPIC_API_KEY;
		return new Promise((resolve, reject) => {
			const child = spawn("npx", args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
			let out = "";
			let err = "";
			child.stdout.on("data", (c: Buffer) => { out += c; });
			child.stderr.on("data", (c: Buffer) => { err += c; });
			const timer = setTimeout(() => child.kill("SIGTERM"), 25 * 60_000);
			child.on("error", reject);
			child.on("close", (code) => {
				clearTimeout(timer);
				let result: ClaudeCodeResult | undefined;
				try { result = JSON.parse(out) as ClaudeCodeResult; } catch { /* reported below */ }
				const u = result?.usage ?? {};
				usage.input += (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
				usage.output += u.output_tokens ?? 0;
				// The plan chooses the model when none is named; the credit line names what actually ran.
				const ran = Object.keys(result?.modelUsage ?? {}).find((k) => k.startsWith("claude-") && !k.includes("haiku"));
				if (ran) self.id = `${ran} via Claude Code`;
				if (!result || result.is_error || code !== 0 || result.structured_output === undefined) {
					reject(new Error(`Claude Code stopped (${result?.subtype ?? `exit ${code}`}): ${(result?.result ?? err ?? out).trim().slice(-600)}`));
					return;
				}
				resolve(result.structured_output);
			});
			child.stdin.end(user);
		});
	}
	const self: Model = {
		provider: "claude-code",
		id: id ? `${id} via Claude Code` : "Claude Code",
		usage,
		async loop(a) {
			const root = a.root();
			const user = `${a.user}\n\nThe pull request's head commit is checked out in your working directory, ${root}. Read and search it with Read, Grep and Glob, then hand in the audit in the required structure.`;
			return await run(root, a.system, user, a.answer.schema, "Read,Grep,Glob", "high");
		},
		async json(system, user, schema, effort) {
			return await run(mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "silvertongue-write-")), system, user, schema, "", effort);
		},
	};
	return self;
}
