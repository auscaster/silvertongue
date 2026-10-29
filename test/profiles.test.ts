import assert from "node:assert/strict";
import { test } from "node:test";
import { readProfiles, validateProfile } from "../spec/voice/v1/profile.ts";

const directory = new URL("../profiles", import.meta.url).pathname;
const profiles = await readProfiles(directory);

test("every profile in profiles/ validates", () => {
	assert.ok(profiles.length > 0);
	for (const p of profiles) assert.ok(p.metadata.slug);
});

test("rejects a VOICE.md without a required section", () => {
	const { metadata, voice } = profiles[0];
	assert.throws(
		() => validateProfile(metadata, voice.replace("\n## Restraint\n", "\n")),
		/missing Restraint/,
	);
});

test("rejects CRLF newlines", () => {
	const { metadata, voice } = profiles[0];
	assert.throws(
		() => validateProfile(metadata, voice.replaceAll("\n", "\r\n")),
		/LF newlines/,
	);
});

test("rejects an observation that cites an unknown source", () => {
	const { metadata, voice } = profiles[0];
	const observations = [
		...metadata.observations,
		{ trait: "Cites nothing real at all.", sourceIds: ["missing"] },
	];
	assert.throws(
		() => validateProfile({ ...metadata, observations }, voice),
		/unknown source/,
	);
});

test("rejects a source that is not an https link", () => {
	const { metadata, voice } = profiles[0];
	const sources = metadata.sources.map((s, i) =>
		i ? s : { ...s, url: s.url.replace("https://", "http://") },
	);
	assert.throws(() => validateProfile({ ...metadata, sources }, voice));
});
