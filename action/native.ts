// Native reviewers own analysis. These adapters select their real review entry points and collect
// structured findings; they do not replace the review instructions with Silvertongue's voice or rubric.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Agent, Usage } from "./models.ts";

export const CLAUDE_CLI = "@anthropic-ai/claude-code@2.1.323";
export const CODEX_CLI = "@openai/codex@0.166.0";

export interface Command { args: string[]; cwd: string; env: NodeJS.ProcessEnv; input: string }
export type Run = (command: Command) => Promise<string>;
export interface NativeResult { value: unknown; usage: Usage; model?: string }

export interface ClaudeUsage {
	modelUsage?: Record<string, { inputTokens?: number; outputTokens?: number; cacheReadInputTokens?: number; cacheCreationInputTokens?: number }>;
	usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

/** Bundled commands report their work in modelUsage even when top-level usage is zero. */
export function claudeUsage(result: ClaudeUsage): Usage {
	const models = Object.values(result.modelUsage ?? {});
	if (models.some((m) => m.inputTokens !== undefined || m.outputTokens !== undefined)) {
		return models.reduce((total, m) => ({ input: total.input + (m.inputTokens ?? 0) + (m.cacheReadInputTokens ?? 0) + (m.cacheCreationInputTokens ?? 0), output: total.output + (m.outputTokens ?? 0) }), { input: 0, output: 0 });
	}
	const u = result.usage ?? {};
	return { input: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens ?? 0 };
}

// Native reviewers receive only their model credential. Both compare the pinned local Git history.
// The Action alone reads GitHub and owns publication.
function environment(auth: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {};
	for (const name of ["PATH", "HOME", "TMPDIR", "RUNNER_TEMP", "SystemRoot", "LANG", "LC_ALL", "NODE_EXTRA_CA_CERTS"]) {
		if (process.env[name]) env[name] = process.env[name];
	}
	return { ...env, ...auth, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1" };
}

export const run: Run = (command) => new Promise((resolve, reject) => {
	const child = spawn("npx", command.args, { cwd: command.cwd, env: command.env, stdio: ["pipe", "pipe", "pipe"] });
	let out = ""; let err = "";
	const timer = setTimeout(() => child.kill("SIGTERM"), 25 * 60_000);
	child.stdout.on("data", (chunk: Buffer) => { out += chunk; });
	child.stderr.on("data", (chunk: Buffer) => { err += chunk; });
	child.on("error", (error) => { clearTimeout(timer); reject(error); });
	child.on("close", (code) => {
		clearTimeout(timer);
		if (code !== 0) { reject(new Error(`Native review stopped (exit ${code}): ${err.trim().slice(-600)}`)); return; }
		resolve(out);
	});
	child.stdin.on("error", () => { /* a failed process is reported by close/error */ });
	child.stdin.end(command.input);
});

// /review is the documented built-in /code-review alias, immune to a project skill of the same name.
export async function claudeReview(agent: Agent, model: string, auth: NodeJS.ProcessEnv, execute: Run = run): Promise<NativeResult> {
	const reads = ["Read", "Grep", "Glob", "Agent", "TodoWrite", "ReportFindings", "Bash(pwd:*)", "Bash(git show:*)", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git grep:*)", "Bash(git ls-tree:*)", "Bash(git merge-base:*)", "Bash(git rev-parse:*)", "Bash(git status:*)", "Bash(git ls-files:*)", "Bash(git branch:*)"];
	const args = ["-y", CLAUDE_CLI, "-p",
		"--append-system-prompt", "Review only: do not install dependencies, run repository code, edit files or publish comments. Read applicable CLAUDE.md and AGENTS.md files for repository review rules. Report the native findings using ReportFindings, with repository-relative paths and exact head-commit lines. Do not invent fields or fixes.",
		"--tools", "Read,Grep,Glob,Agent,TodoWrite,Bash,ReportFindings", "--allowedTools", reads.join(","),
		"--disallowedTools", "Edit,Write,NotebookEdit,Bash(gh pr comment:*),Bash(gh pr review:*),Bash(gh api:*),mcp__github_inline_comment__create_inline_comment",
		"--restricted", "--strict-mcp-config", "--permission-prompts", "none", "--no-session-persistence", "--output-format", "stream-json", "--verbose",
		...(model ? ["--model", model] : [])];
	const out = await execute({ args, cwd: agent.root(), env: environment({ ...auth, CLAUDE_CODE_REPORT_FINDINGS: "1" }), input: `/review medium ${agent.pull.base}...${agent.pull.head}` });
	const events = out.split("\n").filter(Boolean).map((line) => JSON.parse(line));
	const result = events.findLast((event) => event.type === "result");
	const reports = events.flatMap((event) => event.type === "assistant" ? event.message?.content ?? [] : []).filter((block) => block.type === "tool_use" && block.name === "ReportFindings");
	const report = reports.at(-1);
	const acknowledged = events.some((event) => event.type === "user" && event.message?.content?.some((block: { type: string; tool_use_id?: string; is_error?: boolean }) => block.type === "tool_result" && block.tool_use_id === report?.id && !block.is_error));
	if (!result || result.is_error || result.subtype !== "success" || !report || !acknowledged || !Array.isArray(report.input?.findings)) throw new Error(`Claude's native review did not finish with structured findings: ${result?.result ?? "no completed ReportFindings"}`);
	const findings = report.input.findings.map((f: { file: string; line?: number; summary: string; failure_scenario: string; category?: string }) => ({ path: f.file, line: f.line, challenge: f.summary, evidence: f.failure_scenario, ...(f.category ? { category: f.category } : {}) }));
	return { value: { verdict: findings.length ? "reshape" : "accept", assessment: findings.length ? `${findings.length} actionable findings from the native review.` : "The native review found no actionable defects.", findings }, usage: claudeUsage(result), model: Object.keys(result.modelUsage ?? {}).find((m) => m.startsWith("claude-") && !m.includes("haiku")) };
}

// Codex's native CLI exposes a rendered report, not its internal ReviewOutputEvent.
// Keep that report intact. Never infer an approval from an empty findings list or from prose.
export async function codexReview(agent: Agent, model: string, key: string, execute: Run = run): Promise<NativeResult> {
	const dir = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "silvertongue-native-"));
	const output = join(dir, "review.txt");
	const args = ["-y", CODEX_CLI, "exec", "review", "--base", agent.pull.base, "--model", model, "--ignore-user-config", "--ignore-rules", "--ephemeral", "--json", "--output-last-message", output,
		"-c", 'sandbox_mode="read-only"', "-c", 'approval_policy="never"', "-c", 'developer_instructions="Review only: do not install dependencies, run repository code, edit files or publish comments."'];
	try {
		const out = await execute({ args, cwd: agent.root(), env: environment({ CODEX_API_KEY: key }), input: "" });
		let completed = false; let inspected = false; const usage: Usage = { input: 0, output: 0 };
		for (const line of out.split("\n").filter(Boolean)) {
			const event = JSON.parse(line);
			if (event.type === "turn.failed" || event.type === "error") throw new Error(`Codex native review failed: ${event.error?.message ?? line}`);
			if (event.type === "item.completed" && event.item?.type === "command_execution" && event.item.exit_code === 0 && /\bgit (diff|show)\b/.test(event.item.command) && event.item.aggregated_output?.trim()) inspected = true;
			if (event.type === "turn.completed") { completed = true; usage.input += event.usage?.input_tokens ?? 0; usage.output += event.usage?.output_tokens ?? 0; }
		}
		const report = readFileSync(output, "utf8").trim();
		if (!completed || !inspected || !report) throw new Error("Codex native review did not complete an inspection of the pinned change. No review was posted.");
		if (usage.input === 0 && usage.output === 0) usage.incomplete = true;
		return { value: { verdict: "comment", assessment: report, findings: [], report }, usage, model };
	} finally { rmSync(dir, { recursive: true, force: true }); }
}
