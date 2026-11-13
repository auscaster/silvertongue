import assert from "node:assert/strict";
import { test } from "node:test";
import type { Audit } from "../action/audit.ts";
import { commentableLines } from "../action/github.ts";
import { humourOf, write } from "../action/voice.ts";
import { providerOf } from "../action/models.ts";
import { compose, flatten } from "../action/review.ts";

const patch = "@@ -10,4 +10,5 @@ func a() {\n context\n-removed\n+added one\n+added two\n context\n\\ No newline at end of file";

test("a review comment can sit on added and context lines of the new side, never on removed ones", () => {
	assert.deepEqual([...commentableLines(patch)], [10, 11, 12, 13]);
	assert.equal(commentableLines(undefined).size, 0);
});

const audit: Audit = {
	verdict: "reshape",
	assessment: "It should exist.",
	findings: [
		{ severity: "major", category: "duplication", path: "a.go", line: 11, challenge: "Why twice?", evidence: "Read a.go:11.", remedy: "Delete one." },
		{ severity: "minor", category: "hygiene", path: "b.go", line: 99, challenge: "Stale note?", evidence: "Read b.go:99.", remedy: "Update it." },
	],
};
const written = { summary: "Opening.", comments: [{ finding: 1, body: "In the voice." }, { finding: 2, body: "Also in the voice." }] };
const voice = { voiceId: "marcus-aurelius@sha256:0", name: "Marcus Aurelius", instructions: "", min: 100, max: 220, lane: "classics" };
const link = (path: string, line: number) => `https://example/${path}#L${line}`;

test("a finding on a changed line becomes a line comment; one elsewhere goes in the body with a link", () => {
	const review = compose(audit, written, voice, "claude-opus-5-5", [{ path: "a.go", status: "modified", additions: 2, deletions: 1, patch }], link, true);
	assert.equal(review.event, "REQUEST_CHANGES");
	assert.deepEqual(review.comments.map((c) => [c.path, c.line]), [["a.go", 11]]);
	assert.match(review.comments[0]!.body, /^In the voice\.\n\n<details><summary><b>Major<\/b>/);
	assert.match(review.body, /\[`b\.go:99`\]\(https:\/\/example\/b\.go#L99\) Also in the voice\./);
	assert.match(review.body, /<sub>Written in the voice of Marcus Aurelius/);
	assert.equal(compose({ ...audit, verdict: "accept" }, written, voice, "m", [], link, true).event, "COMMENT");
	assert.equal(compose(audit, written, voice, "m", [], link, false).event, "COMMENT");
});

test("flattening keeps every comment, moved into the body above the credit line", () => {
	const review = compose(audit, written, voice, "m", [{ path: "a.go", status: "modified", additions: 2, deletions: 1, patch }], link, true);
	const flat = flatten(review, link);
	assert.equal(flat.comments.length, 0);
	assert.ok(flat.body.indexOf("In the voice.") < flat.body.indexOf("<sub>Written"));
});

test("the model id names its provider", () => {
	assert.equal(providerOf("claude-opus-5-5"), "anthropic");
	assert.equal(providerOf("gpt-6.1-sol"), "openai");
	assert.equal(providerOf("gemini-4-argon"), "gemini");
	assert.equal(providerOf("llama-4"), undefined);
});


test("shipped full humour remains roast and off does not demand a comedian's dig", async () => {
	assert.equal(humourOf("comedy"), "roast");
	assert.equal(humourOf("classics"), "light");
	assert.equal(humourOf("comedy", "full"), "roast");
	assert.equal(humourOf("comedy", "off"), "off");
	assert.throws(() => humourOf(undefined, "invalid"), /humour must/);
	let prompt = "";
	const model = { provider: "openai" as const, id: "fake", usage: { input: 0, output: 0 }, review: async () => audit, json: async (_system: string, user: string) => { prompt = user; return written; } };
	await write(model, { ...voice, lane: "comedy" }, { number: 3, title: "Change", author: "test", changedFiles: 1, additions: 1, deletions: 1 } as Parameters<typeof write>[2], audit, "off");
	assert.match(prompt, /leave the jokes out/);
	assert.doesNotMatch(prompt, /reluctantly|comes with a dig|Go for the laugh/);
});

test("native findings keep their original evidence without manufacturing a severity or fix", () => {
	const native = { ...audit, findings: [{ path: "a.go", line: 11, challenge: "Valid input is rejected.", evidence: "When a valid record is passed, line 11 returns false." }] };
	const review = compose(native, written, voice, "m", [{ path: "a.go", status: "modified", additions: 2, deletions: 1, patch }], link, true);
	assert.match(review.comments[0]!.body, /Valid input is rejected/);
	assert.match(review.comments[0]!.body, /When a valid record is passed/);
	assert.doesNotMatch(review.comments[0]!.body, /undefined|\*\*Fix\.\*\*|Major/);
});


test("a native report is retained byte-for-byte and never becomes an approval or fabricated inline findings", () => {
	const report = "No defects found.\nThis is the exact native report.";
	const review = compose({ verdict: "comment", assessment: report, report, findings: [] }, { summary: "Voiced opening.", comments: [] }, voice, "m", [], link, true);
	assert.equal(review.event, "COMMENT");
	assert.equal(review.comments.length, 0);
	assert.ok(review.body.includes(report));
});


test("voicing cannot add, drop or duplicate findings even if a provider cannot enforce array bounds", async () => {
	for (const comments of [[], [{ finding: 1, body: "one" }], [{ finding: 1, body: "one" }, { finding: 1, body: "duplicate" }], [{ finding: 1, body: "one" }, { finding: 3, body: "invented" }]]) {
		const model = { provider: "openai" as const, id: "fake", usage: { input: 0, output: 0 }, review: async () => audit, json: async () => ({ summary: "Opening.", comments }) };
		await assert.rejects(write(model, voice, { number: 3, title: "Change", author: "test", changedFiles: 1, additions: 1, deletions: 1 } as Parameters<typeof write>[2], audit, "light"), /did not preserve/);
	}
});
