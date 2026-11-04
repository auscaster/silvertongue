import assert from "node:assert/strict";
import { test } from "node:test";
import {
	endingOf,
	examplesOf,
	openingOf,
	readProfiles,
	section,
	signaturesOf,
	validateProfile,
} from "../spec/voice/v3/profile.ts";

const directory = new URL("../profiles", import.meta.url).pathname;
const profiles = await readProfiles(directory);

test("every profile in profiles/ validates", () => {
	assert.ok(profiles.length > 0);
	for (const p of profiles) assert.ok(p.metadata.slug);
});

test("rejects a VOICE.md without a required section", () => {
	const { metadata, voice } = profiles[0];
	assert.throws(
		() => validateProfile(metadata, voice.replace("\n## Moves\n", "\n")),
		/missing Moves/,
	);
});

/** The profile with its Examples section replaced by these drafts, each on an everyday point. */
const withExamples = (voice: string, drafts: readonly string[]) => {
	const pool = drafts
		.map((d, i) => `- **Point:** Everyday point ${i + 1}.\n  **Draft:** ${d}`)
		.join("\n\n");
	return voice.replace(section(voice, "Examples") as string, pool);
};
const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima"];
// Twelve drafts that share no opening, ending or run of three words.
const distinct = names.map(
	(name, i) => `${name} ${names[(i + 1) % 12].toLowerCase()} closes on word${i}.`,
);

test("reads the example pool, with a draft on several lines", () => {
	const { metadata, voice } = profiles[0];
	const pool = withExamples(voice, [
		...distinct.slice(0, 11),
		"Line one of it\n  and line two, ending well.",
	]);
	assert.doesNotThrow(() => validateProfile(metadata, pool));
	assert.equal(examplesOf(pool).length, 12);
	assert.equal(examplesOf(pool)[11].draft, "Line one of it\nand line two, ending well.");
	assert.equal(examplesOf(pool)[0].point, "Everyday point 1.");
});

test("rejects a pool of fewer than twelve examples", () => {
	const { metadata, voice } = profiles[0];
	assert.throws(
		() => validateProfile(metadata, withExamples(voice, distinct.slice(0, 11))),
		/at least 12 examples/,
	);
});

test("rejects an example that is not a point with its draft below", () => {
	const { metadata, voice } = profiles[0];
	const pool = withExamples(voice, distinct).replace(
		"\n  **Draft:** Alpha",
		" **Draft:** Alpha",
	);
	assert.throws(() => validateProfile(metadata, pool), /indented on the line below/);
});

test("rejects two examples that open, end or close alike", () => {
	const { metadata, voice } = profiles[0];
	const pool = (last: string) =>
		withExamples(voice, [...distinct.slice(0, 11), last]);
	assert.throws(
		() => validateProfile(metadata, pool("Alpha bravo again, differently at the end.")),
		/opening "alpha bravo"/,
	);
	assert.throws(
		() => validateProfile(metadata, pool("Somewhere new, it closes on word3!")),
		/last word "word3"/,
	);
	const emoji = [...distinct.slice(0, 10), "Mike signs off 🙏🏾🔥", "November signs off too 🙏🏾🔥"];
	assert.throws(
		() => validateProfile(metadata, withExamples(voice, emoji)),
		/closing marks "🙏🏾🔥"/,
	);
});

/** The profile with its Signatures section replaced by these lines. */
const withSignatures = (voice: string, lines: readonly string[]) =>
	voice.replace(section(voice, "Signatures") as string, lines.join("\n"));
const six = ["One", "Two", "Three", "Four", "Five", "Six"].map(
	(n) => `- **${n} phrase.** When the material calls for ${n.toLowerCase()}.`,
);

test("reads the signatures, each a phrase and when it lands", () => {
	const { metadata, voice } = profiles[0];
	const signed = withSignatures(voice, six);
	assert.doesNotThrow(() => validateProfile(metadata, signed));
	assert.deepEqual(signaturesOf(signed)[0], {
		phrase: "One phrase.",
		when: "When the material calls for one.",
	});
});

test("rejects fewer than six signatures, a malformed one, or the same one twice", () => {
	const { metadata, voice } = profiles[0];
	assert.throws(
		() => validateProfile(metadata, withSignatures(voice, six.slice(0, 5))),
		/at least 6 signatures/,
	);
	assert.throws(
		() => validateProfile(metadata, withSignatures(voice, [...six.slice(0, 5), "- Six phrase, unbolded."])),
		/on one line/,
	);
	assert.throws(
		() => validateProfile(metadata, withSignatures(voice, [...six.slice(0, 5), six[0]])),
		/Two signatures/,
	);
});

test("a real line in Moves is cited, one to a move, and never a passage", () => {
	const { metadata, voice } = profiles[0];
	const moves = (line: string, again = "") =>
		voice.replace(
			section(voice, "Moves") as string,
			`- **The move:** how it works. In their words: "${line}"${again}`,
		);
	const cited = (line: string) => ({
		...metadata,
		observations: [
			...metadata.observations,
			{ trait: `The move, in their words: "${line}"`, sourceIds: [metadata.sources[0].id] },
		],
	});
	const line = "A real line they said, once, on the record.";
	assert.doesNotThrow(() => validateProfile(cited(line), moves(line)));
	assert.throws(() => validateProfile(metadata, moves(line)), /needs an observation/);
	assert.throws(
		() => validateProfile(cited(line), moves(line, ' And again: "Another line."')),
		/at most one real line/,
	);
	const passage = "word ".repeat(40).trim();
	assert.throws(() => validateProfile(cited(passage), moves(passage)), /at most 160/);
});

test("an opening is the first two words, an ending the last word and the marks after it", () => {
	assert.equal(openingOf("Okay. So the fridge, again."), "okay so");
	assert.deepEqual(endingOf("Clean it out by Friday."), { word: "friday", tail: "" });
	assert.deepEqual(endingOf("droppin Friday!! 🙏🏾🔥 "), {
		word: "friday",
		tail: "!!🙏🏾🔥",
	});
	assert.deepEqual(endingOf("It's raw ...."), { word: "raw", tail: "...." });
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

test("rejects a profile without a lane, or with one outside the six", () => {
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

test("every voice has its own iconic example: a message of two sentences or more, and a draft with no em dash or real line", async () => {
	const { metadata, voice } = profiles[0];
	const { example: _, ...without } = metadata;
	assert.throws(() => validateProfile(without, voice));
	const example = (change: Partial<typeof metadata.example>) =>
		validateProfile({ ...metadata, example: { ...metadata.example, ...change } }, voice);
	assert.throws(
		() => example({ message: "One long sentence that runs on and on with no second sentence for the voice to work with at all" }),
		/two sentences/,
	);
	assert.throws(() => example({ text: `${metadata.example.text} — then more.` }), /em dash/);
	const line = voice.match(/In (?:his|her|their) words: "([^"]+)"/)?.[1];
	assert.ok(line);
	assert.throws(() => example({ text: `${metadata.example.text} ${line}` }), /real line/);
	const { mkdtemp, cp, readFile, writeFile, rm } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const dir = await mkdtemp(join(tmpdir(), "silvertongue-example-"));
	try {
		const [a, b] = profiles;
		for (const p of [a, b])
			await cp(join(directory, p.metadata.slug), join(dir, p.metadata.slug), {
				recursive: true,
			});
		const path = join(dir, b.metadata.slug, "profile.json");
		const copied = JSON.parse(await readFile(path, "utf8"));
		await writeFile(
			path,
			JSON.stringify({ ...copied, example: { ...copied.example, message: a.metadata.example.message } }),
		);
		await assert.rejects(readProfiles(dir), /share an example message/);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("a featured voice has a comparison, only a featured voice does, and they share one message", async () => {
	const featured = profiles.find((p) => p.metadata.featured)!;
	const plain = profiles.find((p) => !p.metadata.featured)!;
	const { comparison: _, ...without } = featured.metadata;
	assert.throws(() => validateProfile(without, featured.voice), /featured voice/);
	assert.throws(
		() =>
			validateProfile(
				{ ...plain.metadata, comparison: plain.metadata.example },
				plain.voice,
			),
		/featured voice/,
	);
	const { mkdtemp, cp, readFile, writeFile, rm } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const dir = await mkdtemp(join(tmpdir(), "silvertongue-comparison-"));
	try {
		const [a, b] = profiles.filter((p) => p.metadata.featured);
		for (const p of [a, b])
			await cp(join(directory, p.metadata.slug), join(dir, p.metadata.slug), {
				recursive: true,
			});
		const path = join(dir, b.metadata.slug, "profile.json");
		const copied = JSON.parse(await readFile(path, "utf8"));
		await writeFile(
			path,
			JSON.stringify({
				...copied,
				comparison: {
					...copied.comparison,
					message: "A different message. It has two sentences.",
				},
			}),
		);
		await assert.rejects(readProfiles(dir), /shares one message/);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("rejects a pet phrase in more than two examples, and a doubled space", () => {
	const { metadata, voice } = profiles[0];
	const pet = (n: number) =>
		withExamples(
			voice,
			distinct.map((d, i) => (i < n ? `${d} Cracking good show, ${names[i]}.` : d)),
		);
	assert.doesNotThrow(() => validateProfile(metadata, pet(2)));
	assert.throws(() => validateProfile(metadata, pet(3)), /"cracking good show" appears in 3/);
	assert.throws(
		() => validateProfile(metadata, withExamples(voice, [...distinct.slice(0, 11), "Mike says hi.  Then goes."])),
		/doubled space/,
	);
});

test("a quarter of the pool at most lands a signature, one to a draft, and none uses a real line", () => {
	const { metadata, voice } = profiles[0];
	const signed = withSignatures(voice, [
		...six.slice(0, 4),
		"- **Believe.** Someone doubts they can do it.",
		"- **Do you believe in miracles?** Something unlikely just happened.",
	]);
	const landing = (n: number, line = "one phrase") =>
		withExamples(
			signed,
			distinct.map((d, i) => (i < n ? `${d} ${names[i]} ${line} ${names[(i + 5) % 12]}.` : d)),
		);
	assert.doesNotThrow(() => validateProfile(metadata, landing(3)));
	assert.throws(() => validateProfile(metadata, landing(4)), /4 of 12 do/);
	// A line inside a longer one lands with it, once.
	assert.doesNotThrow(() => validateProfile(metadata, landing(1, "do you believe in miracles")));
	assert.throws(() => validateProfile(metadata, landing(1, "one phrase or two phrase")), /lands two signatures/);
	const line = "A real line they said, once, on the record.";
	const moved = withExamples(
		voice.replace(section(voice, "Moves") as string, `- **The move:** how it works. In their words: "${line}"`),
		[...distinct.slice(0, 11), `Lima alpha said ${line}`],
	);
	const cited = {
		...metadata,
		observations: [...metadata.observations, { trait: `The move: "${line}"`, sourceIds: [metadata.sources[0].id] }],
	};
	assert.throws(() => validateProfile(cited, moved), /uses the real line/);
});

test("lookalikes are four or more other people, each named once", () => {
	const { metadata, voice } = profiles[0];
	const withLookalikes = (lookalikes: string[]) => ({ ...metadata, lookalikes });
	assert.throws(() => validateProfile(withLookalikes(metadata.lookalikes.slice(0, 3)), voice));
	assert.throws(
		() => validateProfile(withLookalikes([...metadata.lookalikes.slice(0, 3), metadata.name]), voice),
		/never the voice itself/,
	);
	assert.throws(
		() => validateProfile(withLookalikes([...metadata.lookalikes, metadata.lookalikes[0]]), voice),
		/each named once/,
	);
});
