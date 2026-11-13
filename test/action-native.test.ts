import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { audit } from "../action/audit.ts";
import { GitHub } from "../action/github.ts";
import type { Agent, Model } from "../action/models.ts";
import { CLAUDE_CLI, CODEX_CLI, claudeReview, claudeUsage, codexReview, run } from "../action/native.ts";

const report = { status: "reviewed", verdict: "reshape", assessment: "A valid record is rejected.", findings: [{ severity: "major", category: "bug", path: "record.ts", line: 2, challenge: "The valid case fails.", evidence: "record.ts:2 returns false for a valid record.", remedy: "Return true for a valid record." }] };
const claudeFinding = { file: "record.ts", line: 2, summary: "The valid case fails.", failure_scenario: "record.ts:2 returns false for a valid record.", category: "correctness" };
function claudeEvents(findings: unknown[] = [claudeFinding]) {
	return [
		{ type: "assistant", message: { content: [{ type: "tool_use", id: "report-1", name: "ReportFindings", input: { findings } }] } },
		{ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "report-1", content: "accepted" }] } },
		{ type: "system", subtype: "task_notification", summary: "/code-review", status: "completed" },
		{ type: "result", subtype: "success", is_error: false, modelUsage: { "claude-opus-5-5": { inputTokens: 3, cacheReadInputTokens: 5, cacheCreationInputTokens: 7, outputTokens: 11 } }, usage: { input_tokens: 0, output_tokens: 0 } },
	].map(e => JSON.stringify(e)).join("\n");
}
const expected = { verdict: report.verdict, assessment: report.assessment, findings: report.findings };
const agent: Agent = { pull: { url: "https://github.com/example/project/pull/3", head: "a".repeat(40), base: "b".repeat(40) }, system: "THE OLD CUSTOM AUDIT MUST NOT REPLACE NATIVE REVIEW", user: "CUSTOM AUDIT BRIEF", tools: [], handle: async () => ({ output: "" }), answer: { name: "submit_audit", description: "", schema: { type: "object", properties: {}, required: [] } }, finish: "", maxTurns: 1, root: () => tmpdir() };

test("Claude invokes the bundled code-review alias, preserves the native system and prohibits direct posting", async (t) => {
	const previous = process.env["INPUT_GITHUB-TOKEN"]; process.env["INPUT_GITHUB-TOKEN"] = "fake-publishing-token";
	t.after(() => { if (previous === undefined) delete process.env["INPUT_GITHUB-TOKEN"]; else process.env["INPUT_GITHUB-TOKEN"] = previous; });
	let commands = 0;
	const result = await claudeReview(agent, "claude-opus-5-5", { ANTHROPIC_API_KEY: "fake-key" }, async (command) => {
		commands++;
		assert.equal(command.args[1], CLAUDE_CLI);
		assert.equal(command.input, `/review medium ${agent.pull.base}...${agent.pull.head}`);
		assert.ok(!command.args.includes("--plugin-dir"));
		assert.ok(!command.args.includes("--bare"));
		assert.ok(command.args.includes("--restricted"));
		assert.ok(command.args.includes("--strict-mcp-config"));
		assert.ok(!command.args.includes("--system-prompt-file"));
		assert.ok(!command.args.join(" ").includes(agent.system));
		assert.ok(!command.input.includes("--comment"));
		assert.equal(command.env.ANTHROPIC_API_KEY, "fake-key");
		assert.equal(command.env.GH_TOKEN, undefined);
		assert.equal(command.env.GITHUB_TOKEN, undefined);
		assert.equal(command.env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
		assert.equal(command.env.INPUT_OPENAI_API_KEY, undefined);
		const denied = command.args[command.args.indexOf("--disallowedTools") + 1]!;
		assert.match(denied, /gh pr comment/);
		assert.match(denied, /github_inline_comment/);
		assert.equal(command.env.CLAUDE_CODE_REPORT_FINDINGS, "1");
		return claudeEvents();
	});
	assert.equal(commands, 1);
	assert.deepEqual(result.value, { verdict: "reshape", assessment: "1 actionable findings from the native review.", findings: [{ path: "record.ts", line: 2, challenge: claudeFinding.summary, evidence: claudeFinding.failure_scenario, category: "correctness" }] });
	assert.deepEqual(result.usage, { input: 15, output: 11 });
});

test("a Claude subscription uses the same complete upstream review without bare mode", async () => {
	await claudeReview(agent, "", { CLAUDE_CODE_OAUTH_TOKEN: "fake-subscription" }, async (command) => {
		assert.ok(!command.args.includes("--bare"));
		assert.ok(!command.args.includes("--model"));
		assert.equal(command.env.CLAUDE_CODE_OAUTH_TOKEN, "fake-subscription");
		assert.equal(command.env.ANTHROPIC_API_KEY, undefined);
		return claudeEvents();
	});
});

test("Codex runs native exec review and retains its report without inferring approval", async () => {
	const result = await codexReview(agent, "gpt-6.1-sol", "fake-key", async (command) => {
		assert.deepEqual(command.args.slice(0, 4), ["-y", CODEX_CLI, "exec", "review"]);
		assert.equal(command.args[command.args.indexOf("--base") + 1], agent.pull.base);
		assert.ok(command.args.includes('sandbox_mode="read-only"'));
		assert.equal(command.env.CODEX_API_KEY, "fake-key");
		assert.equal(command.env.GITHUB_TOKEN, undefined);
		writeFileSync(command.args[command.args.indexOf("--output-last-message") + 1]!, "No actionable defects found.");
		return [
			{ type: "item.completed", item: { type: "command_execution", command: "git diff base", exit_code: 0, aggregated_output: "diff --git a/record.ts b/record.ts" } },
			{ type: "turn.completed", usage: { input_tokens: 17, output_tokens: 23 } },
		].map(e => JSON.stringify(e)).join("\n");
	});
	assert.deepEqual(result.value, { verdict: "comment", assessment: "No actionable defects found.", findings: [], report: "No actionable defects found." });
	assert.deepEqual(result.usage, { input: 17, output: 23 });
});

test("skipped, failed and malformed native results never become an accepting review or invoke a fallback", async () => {
	for (const result of [{ type: "result", structured_output: { ...report, status: "skipped", assessment: "Draft PR." } }, { type: "result", is_error: true, result: "Limit reached." }, {}]) {
		let calls = 0;
		await assert.rejects(claudeReview(agent, "", {}, async () => { calls++; return JSON.stringify(result); }));
		assert.equal(calls, 1);
	}
	await assert.rejects(codexReview(agent, "gpt-6.1-sol", "fake-key", async () => JSON.stringify({ type: "turn.failed", error: { message: "Provider stopped." } })), /Provider stopped/);
});

test("the subprocess boundary passes the actual CLI arguments and stdin to a disposable fake executable", async (t) => {
	const dir = mkdtempSync(join(tmpdir(), "silvertongue-cli-test-"));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	writeFileSync(join(dir, "npx"), `#!${process.execPath}\nlet input = ''; process.stdin.on('data', c => input += c); process.stdin.on('end', () => process.stdout.write(JSON.stringify({args: process.argv.slice(2), input, key: process.env.TEST_FAKE_KEY})));\n`, { mode: 0o755 });
	const output = JSON.parse(await run({ args: ["-y", "fake-native-cli", "exec", "review"], cwd: dir, env: { PATH: dir, TEST_FAKE_KEY: "not-a-credential" }, input: "review the pinned head" }));
	assert.deepEqual(output, { args: ["-y", "fake-native-cli", "exec", "review"], input: "review the pinned head", key: "not-a-credential" });
});

test("native review targets a pinned comparison without sending PR metadata or the custom rubric", async () => {
	await claudeReview({ ...agent, user: "untrusted PR metadata", system: "custom rubric" }, "", {}, async (command) => {
		assert.equal(command.input, `/review medium ${agent.pull.base}...${agent.pull.head}`);
		assert.ok(!command.input.includes(agent.pull.url));
		assert.ok(!command.args.includes("--system-prompt"));
		assert.ok(!command.args.includes("--system-prompt-file"));
		return claudeEvents();
	});
});

test("source acquisition retains divergent base/head ancestry and immutable head reads; invalid locations fail", async (t) => {
	const dir = mkdtempSync(join(tmpdir(), "silvertongue-git-test-"));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const work = join(dir, "work"); mkdirSync(work);
	const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "core.hooksPath=/dev/null", ...args], { cwd: work, env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
	git("init", "-q", "-b", "main"); writeFileSync(join(work, "record.ts"), "one\noriginal\n"); git("add", "."); git("commit", "-qm", "initial");
	const common = git("rev-parse", "HEAD");
	git("checkout", "-qb", "feature"); writeFileSync(join(work, "record.ts"), "one\nhead\n"); git("commit", "-qam", "head"); const head = git("rev-parse", "HEAD");
	git("checkout", "-q", "main"); writeFileSync(join(work, "base.txt"), "base advanced\n"); git("add", "."); git("commit", "-qm", "base"); const base = git("rev-parse", "HEAD");
	mkdirSync(join(dir, "example")); git("clone", "-q", "--bare", work, join(dir, "example/project.git"));
	const previous = process.env.GITHUB_SERVER_URL; process.env.GITHUB_SERVER_URL = `file://${dir}`;
	const source = new GitHub({ owner: "example", name: "project" }, "fake-token").fetchSource(head, base);
	if (previous === undefined) delete process.env.GITHUB_SERVER_URL; else process.env.GITHUB_SERVER_URL = previous;
	t.after(() => rmSync(source.checkout(), { recursive: true, force: true }));
	const actualGit = (...args: string[]) => execFileSync("git", args, { cwd: source.checkout(), encoding: "utf8" }).trim();
	assert.equal(actualGit("merge-base", head, base), common);
	assert.equal(actualGit("rev-parse", "HEAD"), head);
	assert.match(actualGit("diff", `${base}...HEAD`), /\+head/);
	assert.equal(source.read("record.ts"), "one\nhead\n");
	assert.equal(source.exists("base.txt"), false);
	assert.deepEqual(source.search("head", ""), ["record.ts:2:head"]);
	assert.deepEqual(source.list(""), ["record.ts"]);
	assert.ok(!actualGit("config", "--list").includes("fake-token"));
	const pull = { number: 3, title: "Fix record", body: "", author: "test", url: agent.pull.url, headSha: head, baseSha: base, baseRef: "main", additions: 1, deletions: 1, changedFiles: 1, draft: false };
	const reviewer: Model = { provider: "openai", id: "fake", usage: { input: 0, output: 0 }, json: async () => { throw new Error("No voice in the analysis phase."); }, review: async (a) => { assert.equal(a.pull.base, base); return expected; } };
	assert.deepEqual(await audit(reviewer, pull, [], [], source, () => {}), expected);
	for (const path of ["../outside", "/tmp/outside", ".git/config", "missing.ts"]) {
		await assert.rejects(audit({ ...reviewer, review: async () => ({ ...expected, findings: [{ ...report.findings[0], path }] }) }, pull, [], [], source, () => {}), /outside the pinned head/);
	}
});


test("Claude accounts for per-model native usage once, including cached tokens", () => {
	assert.deepEqual(claudeUsage({ usage: { input_tokens: 0, output_tokens: 0 }, modelUsage: { opus: { inputTokens: 20, cacheReadInputTokens: 93252, cacheCreationInputTokens: 20793, outputTokens: 4974 } } }), { input: 114065, output: 4974 });
	assert.deepEqual(claudeUsage({ usage: { input_tokens: 8, output_tokens: 9 }, modelUsage: { opus: { inputTokens: 2, outputTokens: 3 }, haiku: { inputTokens: 5, outputTokens: 7 } } }), { input: 7, output: 10 });
	assert.deepEqual(claudeUsage({ usage: { input_tokens: 8, output_tokens: 9 } }), { input: 8, output: 9 });
});

test("an empty completed ReportFindings is clean; a missing or failed reporting tool is not", async () => {
	const result = await claudeReview(agent, "", {}, async () => claudeEvents([]));
	assert.equal((result.value as {verdict:string}).verdict, "accept");
	for (const text of [claudeEvents().replace('"tool_result"', '"missing"'), claudeEvents().replace('"subtype":"success"', '"subtype":"error"'), claudeEvents().replace('"content":"accepted"', '"is_error":true')]) {
		await assert.rejects(claudeReview(agent, "", {}, async () => text), /did not finish/);
	}
});


test("a Codex sandbox failure or absent diff cannot become a clean review", async () => {
	await assert.rejects(codexReview(agent, "gpt-6.1-sol", "fake-key", async (command) => {
		writeFileSync(command.args[command.args.indexOf("--output-last-message") + 1]!, "Review skipped: no repository access.");
		return JSON.stringify({ type: "turn.completed", usage: { input_tokens: 0, output_tokens: 0 } });
	}), /did not complete an inspection/);
});
