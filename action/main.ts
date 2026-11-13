// Silvertongue review: audit a pull request with the developer's own model key, then post the review in a
// famous writing voice. Runs on GitHub's runner; the code goes only to the model provider the developer chose.
import { appendFileSync, readFileSync } from "node:fs";
import { audit as runAudit } from "./audit.ts";
import { GitHub } from "./github.ts";
import { DEFAULT_MODEL, model as makeModel, providerOf, type Provider } from "./models.ts";
import { compose, flatten, markdown } from "./review.ts";
import { laneOf, packet, write, type Humour } from "./voice.ts";

const input = (name: string) => (process.env[`INPUT_${name.toUpperCase()}`] ?? "").trim();

function flag(name: string, fallback: boolean): boolean {
	const v = input(name).toLowerCase();
	if (v === "") return fallback;
	if (v === "true" || v === "false") return v === "true";
	throw new Error(`${name} must be true or false, not "${v}".`);
}

function output(name: string, value: string) {
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

// A Claude subscription comes first when it is given: it means no API bill.
const KEYS: [Provider, string][] = [["claude-code", "claude-code-oauth-token"], ["anthropic", "anthropic-api-key"], ["openai", "openai-api-key"], ["gemini", "gemini-api-key"]];

function chooseModel() {
	const keys = Object.fromEntries(KEYS.map(([p, name]) => [p, input(name)])) as Record<Provider, string>;
	const named = input("model");
	let provider = named ? providerOf(named) : KEYS.map(([p]) => p).find((p) => keys[p]);
	if (named && !provider) throw new Error(`model "${named}" is not a Claude, OpenAI or Gemini model id.`);
	if (provider === "anthropic" && keys["claude-code"]) provider = "claude-code";
	if (!provider) throw new Error("Connect a model: claude-code-oauth-token (a Claude subscription, from claude setup-token), or anthropic-api-key, openai-api-key or gemini-api-key.");
	if (!keys[provider]) throw new Error(`model "${named}" needs ${KEYS.find(([p]) => p === provider)![1]}.`);
	return makeModel(provider, named || DEFAULT_MODEL[provider], keys[provider]);
}

function pullNumber(): number {
	const given = input("pull-request");
	if (given) {
		if (!/^\d+$/.test(given)) throw new Error(`pull-request must be a number, not "${given}".`);
		return Number(given);
	}
	const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) as { pull_request?: { number?: number }; issue?: { number?: number; pull_request?: unknown } } : {};
	const n = event.pull_request?.number ?? (event.issue?.pull_request ? event.issue.number : undefined);
	if (!n) throw new Error(`No pull request in a ${process.env.GITHUB_EVENT_NAME ?? "local"} event. Run on pull_request or pull_request_target, or set pull-request.`);
	return n;
}

async function main() {
	const voice = input("voice") || "marcus-aurelius";
	const edge = (input("edge") || "full") as "full" | "clean";
	if (edge !== "full" && edge !== "clean") throw new Error(`edge must be full or clean, not "${edge}".`);
	const humour = (input("humour") || "light") as Humour;
	if (!["off", "light", "full"].includes(humour)) throw new Error(`humour must be off, light or full, not "${humour}".`);
	const post = flag("post", true);
	const requestChanges = flag("request-changes", true);
	const [owner, name] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
	if (!owner || !name) throw new Error("GITHUB_REPOSITORY is not set.");
	const token = input("github-token") || process.env.GITHUB_TOKEN || "";
	if (!token) throw new Error("github-token is empty.");
	const model = chooseModel();
	const gh = new GitHub({ owner, name }, token);
	const number = pullNumber();

	const voicePacket = await packet(voice, edge);
	const pull = await gh.pull(number);
	console.log(`Reviewing #${number} "${pull.title}" (+${pull.additions} -${pull.deletions}) as ${voicePacket.name} with ${model.id}.`);
	const [files, issues] = await Promise.all([gh.files(number), gh.linkedIssues(pull.body)]);
	const source = gh.fetchSource(pull.headSha);

	console.log("::group::Audit");
	const audit = await runAudit(model, pull, files, issues, source, (line) => console.log(line));
	console.log(JSON.stringify(audit, null, 2));
	console.log("::endgroup::");

	const written = await write(model, voicePacket, pull, audit, humour, laneOf(voice));
	const link = (path: string, line: number) => `${gh.server}/${owner}/${name}/blob/${pull.headSha}/${path}#L${line}`;
	let review = compose(audit, written, voicePacket, model.id, files, link, requestChanges);

	console.log("::group::Review");
	console.log(markdown(review));
	console.log("::endgroup::");
	if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Silvertongue review of #${number}\n\n${markdown(review)}\n`);
	output("verdict", audit.verdict);
	console.log(`${model.id} used ${model.usage.input.toLocaleString("en")} input and ${model.usage.output.toLocaleString("en")} output tokens.`);

	if (!post) return;
	let posted = await gh.review(number, { commit_id: pull.headSha, ...review });
	if (posted.status === 422 && review.comments.length) {
		// A line GitHub will not take a comment on: post the same review with the comments in its body.
		review = flatten(review, link);
		posted = await gh.review(number, { commit_id: pull.headSha, ...review });
	}
	if (posted.status === 403 || posted.status === 404) {
		throw new Error(`GitHub would not take the review (${posted.status}: ${posted.message}). The job needs "pull-requests: write"; on a pull request from a fork, run on pull_request_target. The review is in this job's summary.`);
	}
	if (posted.status !== 200) throw new Error(`GitHub would not take the review (${posted.status}: ${posted.message}).`);
	console.log(`Posted: ${posted.url}`);
	output("review-url", posted.url ?? "");
}

main().catch((e: unknown) => {
	console.log(`::error::${(e instanceof Error ? e.message : String(e)).replace(/\n/g, "%0A")}`);
	process.exitCode = 1;
});
