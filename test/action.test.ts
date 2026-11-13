import assert from "node:assert/strict";
import { test } from "node:test";
import type { Audit } from "../action/audit.ts";
import { commentableLines } from "../action/github.ts";
import { providerOf } from "../action/models.ts";
import { compose, flatten } from "../action/review.ts";

const patch = "@@ -10,4 +10,5 @@ func a() {\n context\n-removed\n+added one\n+added two\n context\n\\ No newline at end of file";

test("a review comment can sit on added and context lines of the new side, never on removed ones", () => {
	assert.deepEqual([...commentableLines(patch)], [10, 11, 12, 13]);
	assert.equal(commentableLines(undefined).size, 0);
});

const audit: Audit = {
	verdict: "reshape",
	right_to_exist: "It should exist.",
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
