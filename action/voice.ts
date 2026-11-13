// The voice: its writing instructions come from Silvertongue's public MCP server, the same packet an agent
// gets when it writes in a voice with its own model. Only the voice's name is sent; the code never is.
import type { Audit } from "./audit.ts";
import type { Pull } from "./github.ts";
import type { Model } from "./models.ts";

const MCP = "https://mcp.silvertongue.dev/mcp";

export interface Packet {
	voiceId: string;
	name: string;
	instructions: string;
	min: number;
	max: number;
	/** The catalogue's lane for the voice: it decides what kind of funny the voice is. */
	lane: string | undefined;
}

export type Humour = "off" | "light" | "roast";

/** What someone who picks this voice expects when they ask for no level: a comedian roasts, everyone else gives comic relief. */
export const humourOf = (lane: string | undefined): Humour => (lane === "comedy" ? "roast" : "light");

// How each kind of voice is funny. A comedian tells jokes; a character or a star is funny by being
// themselves at this code; a style is funny by its register; a sage, a founder or a politician is funny
// by taking it completely seriously.
function funny(name: string, lane: string | undefined): string {
	if (lane === "comedy") return `${name} is a comedian: being funny is the voice. Write the jokes ${name} would actually tell about this code, with their premise, their turn and their tag, never a quip anyone could make.`;
	if (lane === "characters" || lane === "celebrity") return `${name} is funny by being ${name}: the laugh comes from their persona meeting this code, the way they would react to it, never from jokes stuck on top.`;
	if (lane === "styles") return `${name} is a style, not a person: the laugh is the register itself, said with total conviction about a code review, its own words and moves landing on the specifics of this code.`;
	return `${name} is not a comedian, so never give them a punchline they would not write. The laugh comes from ${name} taking something petty in this code with complete seriousness: their gravity against its triviality, played dead straight.`;
}

// Good code gets its credit. A comedian gives it the way a roast comic does; everyone else as themselves.
function credit(name: string, lane: string | undefined): string {
	if (lane === "comedy") return `When the code is actually good, ${name} admits it, reluctantly: the credit is real and it visibly costs them, and it comes with a dig at whatever small thing deserves one.`;
	return `When the code is actually good, ${name} says so, the way ${name} would.`;
}

const HUMOUR: Record<Humour, string> = {
	off: "Play it straight. Keep the voice, its angle, moves and rhythm, and leave the jokes out.",
	light: "This is a review first, with comic relief. The opening lands one real laugh, and some of the comments have one where the code hands the voice a joke; the rest are the voice played straight. A joke never takes the place of the fix.",
	roast: "This is a roast of the code, and the author asked for it. Go for the laugh in the opening and in every comment, as hard as this voice would, and still land the fix in each one.",
};

export interface Written {
	summary: string;
	comments: { finding: number; body: string }[];
}

async function rpc(body: unknown, session?: string): Promise<{ session?: string; message: unknown }> {
	const res = await fetch(MCP, {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": "silvertongue-review", ...(session ? { "mcp-session-id": session } : {}) },
		body: JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`Silvertongue's voice server answered ${res.status}: ${text.slice(0, 300)}`);
	// Streamable HTTP answers either with JSON or with server-sent events whose data lines carry it.
	const data = text.includes("data:") ? text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).filter(Boolean).at(-1) : text;
	return { session: res.headers.get("mcp-session-id") ?? session, message: data ? JSON.parse(data) : undefined };
}

export async function packet(voice: string, edge: "full" | "clean"): Promise<Packet> {
	const init = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "silvertongue-review", version: "1" } } });
	await rpc({ jsonrpc: "2.0", method: "notifications/initialized" }, init.session);
	const { message } = await rpc({
		jsonrpc: "2.0", id: 2, method: "tools/call",
		params: { name: "get_voice_packet", arguments: { voice, format: "explanation", length: "standard", platform: "github", intensity: "full", edge, emoji: "on", spelling: "voice" } },
	}, init.session);
	const result = (message as { result?: { isError?: boolean; content?: { text?: string }[] }; error?: { message?: string } }).result;
	const text = result?.content?.map((c) => c.text ?? "").join("") ?? "";
	if (!result || result.isError) {
		throw new Error(`No voice "${voice}": ${(text || (message as { error?: { message?: string } }).error?.message || "the voice server gave no packet").replace(/\.$/, "")}. Every voice and its slug is listed at https://silvertongue.dev/voices.`);
	}
	const data = (JSON.parse(text) as { data: { voice_id: string; name: string; instructions: string; target: { min: number; max: number } } }).data;
	const slug = data.voice_id.split("@")[0];
	const found = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search_voices", arguments: { query: data.name, limit: 10 } } }, init.session);
	const listed = (found.message as { result?: { content?: { text?: string }[] } }).result?.content?.map((c) => c.text ?? "").join("") ?? "";
	const lane = listed ? (JSON.parse(listed) as { data: { slug: string; lane: string }[] }).data.find((v) => v.slug === slug)?.lane : undefined;
	return { voiceId: data.voice_id, name: data.name, instructions: data.instructions, min: data.target.min, max: data.target.max, lane };
}

const SCHEMA = {
	type: "object",
	properties: {
		summary: { type: "string" },
		comments: {
			type: "array",
			items: { type: "object", properties: { finding: { type: "integer" }, body: { type: "string" } }, required: ["finding", "body"], additionalProperties: false },
		},
	},
	required: ["summary", "comments"],
	additionalProperties: false,
};

const VERDICT = { reject: "reject (it should not exist in this form)", reshape: "reshape (it should exist, but not in this form)", accept: "accept (it is sound)" };

export async function write(model: Model, voice: Packet, pull: Pull, audit: Audit, humour: Humour): Promise<Written> {
	const findings = audit.findings.map((f, i) => `${i + 1}. [${f.severity}] \`${f.path}:${f.line}\` (${f.category}). ${f.challenge} Evidence: ${f.evidence} Fix: ${f.remedy}`);
	const user = `The user is reviewing a GitHub pull request by @${pull.author}, and posts this review as their own. Write it in the voice.

POINT (fixed facts: keep every file path, line number, name and number exactly, code and paths in backticks, and add nothing that is not here)
Verdict: ${VERDICT[audit.verdict]}
Pull request: #${pull.number}, "${pull.title}": ${pull.changedFiles} files, +${pull.additions} -${pull.deletions}.
Should it exist: ${audit.right_to_exist}
${findings.length ? `Findings:\n${findings.join("\n")}` : "Findings: none."}

THE DRAFTS
- summary: the opening of the review, ${voice.min} to ${voice.max} words. The verdict and the one thing the author must answer first, the way this voice would say it: its angle on this pull request, not a list of the findings, which the comments carry. Never open with the verdict's wording above.
- comments: one draft for each finding, in order, with its number, two to four sentences, posted on that line of the code. Each is this voice's take on that one finding: its angle, one of its moves, landing on what the author should do. Use a different move from the comment before. The plain fix and the evidence are shown under each comment, so write the voice, not a restatement of them.
HUMOUR
${humour === "off" ? HUMOUR.off : `${HUMOUR[humour]} ${funny(voice.name, voice.lane)} Every joke is a real one, worth repeating, and built from the specifics of this code. The joke is on the code, never on the author as a person. Never invent a fault to have something to joke about.`} ${credit(voice.name, voice.lane)}

Plain text except code in backticks: no headings, lists or bold. Return them as JSON.`;
	return await model.json(voice.instructions, user, SCHEMA, "medium") as Written;
}
