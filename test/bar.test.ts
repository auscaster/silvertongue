import assert from "node:assert/strict";
import { test } from "node:test";
import { bar, type Measures, verdict } from "../spec/voice/v3/bar.ts";

const passing: Measures = {
	first: 20,
	recognisedFirst: 16,
	later: 12,
	recognisedLater: 9,
	bangers: 10,
	beatNameOnly: 14,
	pointKept: 20,
	faults: 0,
	landed: 5,
	sameLine: 2,
	drafts: 32,
	tacked: 1,
	takes: [3, 3, 3],
	sameShape: 2,
};

test("a voice that reaches every criterion passes", () => {
	const v = verdict(passing);
	assert.ok(v.passes);
	assert.equal(v.rows.length, bar.length);
});

test("each criterion fails a voice just short of it, and only that one", () => {
	const short: [string, Partial<Measures>][] = [
		["Known on the first draft", { recognisedFirst: 15 }],
		["Known on Try again", { recognisedLater: 8 }],
		["Bangers", { bangers: 9 }],
		["Better than the name alone", { beatNameOnly: 13 }],
		["Does the job", { pointKept: 19 }],
		["Honest and kind", { faults: 1 }],
		["Lines land rarely", { landed: 6 }],
		["Lines land rarely", { sameLine: 3 }],
		["Lines follow", { tacked: 2 }],
		["Range", { takes: [3, 3, 2] }],
		["Range", { takes: [4, 4, 1] }],
		["No set shape", { sameShape: 3 }],
	];
	for (const [name, change] of short) {
		const v = verdict({ ...passing, ...change });
		assert.equal(v.passes, false, name);
		assert.deepEqual(
			v.rows.filter((r) => !r.passes).map((r) => r.name),
			[name],
		);
	}
});
