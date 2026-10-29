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

test("rejects a profile without a lane, or with one outside the five", () => {
	const { metadata, voice } = profiles[0];
	const { lane: _, ...unplaced } = metadata;
	assert.throws(() => validateProfile(unplaced, voice));
	assert.throws(() => validateProfile({ ...metadata, lane: "sports" }, voice));
});

test("two profiles never share a featured place", async () => {
	const { mkdtemp, cp, readFile, writeFile, rm } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const dir = await mkdtemp(join(tmpdir(), "silvertongue-featured-"));
	try {
		const [a, b] = profiles.filter((p) => p.metadata.featured);
		for (const p of [a, b]) {
			await cp(join(directory, p.metadata.slug), join(dir, p.metadata.slug), {
				recursive: true,
			});
		}
		const path = join(dir, b.metadata.slug, "profile.json");
		const metadata = JSON.parse(await readFile(path, "utf8"));
		await writeFile(path, JSON.stringify({ ...metadata, featured: a.metadata.featured }));
		await assert.rejects(readProfiles(dir), /featured place/);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
