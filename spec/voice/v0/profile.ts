import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const formatSchema = z.enum(["post", "reply", "explanation", "thread"]);
export const mediumSchema = z.enum([
	"essay",
	"transcript",
	"speech",
	"letter",
	"post",
	"fiction",
	"play",
	"poem",
	"reference",
]);
export type Medium = z.infer<typeof mediumSchema>;
export const laneSchema = z.enum([
	"tech",
	"celebrity",
	"comedy",
	"characters",
	"classics",
	"politicians",
	"styles",
]);
export type Lane = z.infer<typeof laneSchema>;
/** A language, by its two or three letter tag: "en", "fr", "pt". */
const languageSchema = z.string().regex(/^[a-z]{2,3}$/);
const sourceSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9-]+$/),
		/** The language this source is in, where it is not the voice's own. */
		language: languageSchema.optional(),
		title: z.string().min(1),
		url: z.url({ protocol: /^https$/ }),
		published: z.string().min(4),
		medium: mediumSchema,
		note: z.string().min(20),
	})
	.strict();
/** A message and a voice's version of it, as the site, its link cards and the MCP server show one. */
const shownSchema = z
	.object({
		message: z.string(),
		format: formatSchema,
		text: z.string().min(1),
	})
	.strict();
export const metadataSchema = z
	.object({
		slug: z.string().regex(/^[a-z][a-z0-9-]{0,60}$/),
		name: z.string().min(1),
		/** The language the voice was studied in; English where it is left out. */
		language: languageSchema.optional(),
		lane: laneSchema,
		/** Other names people look for the voice by: a style's other names, or what a voice is searched as. */
		aliases: z
			.array(z.string().regex(/^[a-z0-9][a-z0-9' -]{0,38}[a-z0-9]$/))
			.min(1)
			.max(8)
			.optional(),
		/** Cleared by the maintainers' blind-test quality gate for the app catalogue. */
		verified: z.boolean(),
		featured: z.number().int().min(1).max(99).optional(),
		description: z.string().min(20).max(220),
		scope: z.string().min(30),
		status: z.literal("unofficial"),
		lookalikes: z.array(z.string().min(1)).min(4).max(8),
		strengths: z.array(z.string()).min(2),
		limitations: z.array(z.string()).min(2),
		sources: z.array(sourceSchema).min(3),
		observations: z
			.array(
				z
					.object({
						trait: z.string().min(10),
						sourceIds: z.array(z.string()).min(1),
					})
					.strict(),
			)
			.min(3),
		/** The voice at its most iconic: a message from its own world, and the draft the voice makes of it. */
		example: shownSchema,
		/** On a featured voice: the message every featured voice shares, and this voice's version of it. */
		comparison: shownSchema.optional(),
	})
	.strict();
export type Metadata = z.infer<typeof metadataSchema>;
export interface VoiceProfile {
	metadata: Metadata;
	voice: string;
}

/** The first sentence of the description: what the voice does, in one line. */
export const theMove = (metadata: Metadata): string =>
	metadata.description.split(/(?<=\.)\s/)[0];

const media: Record<Medium, [string, string]> = {
	essay: ["essay", "essays"],
	transcript: ["transcript", "transcripts"],
	speech: ["speech", "speeches"],
	letter: ["letter", "letters"],
	post: ["post", "posts"],
	fiction: ["work of fiction", "works of fiction"],
	play: ["play", "plays"],
	poem: ["poem", "poems"],
	reference: ["reference", "references"],
};

/** What was studied, from the sources: "12 posts and 2 transcripts, 2019 to 2026". */
export function studied(metadata: Metadata): string {
	const counts = new Map<Medium, number>();
	for (const s of metadata.sources)
		counts.set(s.medium, (counts.get(s.medium) ?? 0) + 1);
	const kinds = [...counts].map(
		([m, n]) => `${n} ${media[m][n === 1 ? 0 : 1]}`,
	);
	const list =
		kinds.length > 1
			? `${kinds.slice(0, -1).join(", ")} and ${kinds.at(-1)}`
			: kinds[0];
	const years = metadata.sources.map((s) => s.published.slice(0, 4)).sort();
	const span =
		years[0] === years.at(-1) ? years[0] : `${years[0]} to ${years.at(-1)}`;
	return `${list}, ${span}`;
}
/** The sections a writer works from, in order: what makes a draft theirs. */
export const voiceSections = [
	"Lens",
	"Moves",
	"Texture",
	"Plain",
	"Occasions",
	"Never",
];
export const sections = [
	...voiceSections,
	"Signatures",
	"Facts and identity",
	"Examples",
];

/** One of their catchphrases, and the situation it belongs to. */
export interface Signature {
	readonly phrase: string;
	readonly when: string;
}
export const LEAST_SIGNATURES = 6;
const SIGNATURE = /^- \*\*(.+?)\*\*\s+(.+)$/gmu;

/** The Signatures section: each `- **phrase** when it lands`. */
export function signaturesOf(voice: string): Signature[] {
	return [...(section(voice, "Signatures") ?? "").matchAll(SIGNATURE)].map(
		([, phrase, when]) => ({ phrase: phrase.trim(), when: when.trim() }),
	);
}

function checkSignatures(voice: string, signatures: readonly Signature[]) {
	const entries = (section(voice, "Signatures") ?? "").match(/^- /gm) ?? [];
	if (entries.length !== signatures.length)
		throw new Error(
			"Every signature is `- **the phrase** when it lands`, on one line.",
		);
	if (signatures.length < LEAST_SIGNATURES)
		throw new Error(
			`VOICE.md needs at least ${LEAST_SIGNATURES} signatures; it has ${signatures.length}.`,
		);
	const seen = new Set<string>();
	for (const { phrase } of signatures) {
		const key = phrase.toLowerCase();
		if (phrase.length > 80)
			throw new Error(`A signature is at most 80 characters: "${phrase}".`);
		if (seen.has(key)) throw new Error(`Two signatures are "${phrase}".`);
		seen.add(key);
	}
}

/** A real line of theirs is a line, never a passage. */
export const MOST_LINE_CHARACTERS = 160;

const quoted = (text: string) =>
	[...text.matchAll(/"([^"]+)"/g)].map(([, line]) => line);

/** The real lines the Moves section quotes, one at most to a move. */
export const linesOf = (voice: string): string[] =>
	quoted(section(voice, "Moves") ?? "");

/**
 * A move may show itself in one real line of theirs, in double quotes, and each line is one an
 * observation records, citing the source it was heard or read in.
 */
function checkLines(voice: string, observations: Metadata["observations"]) {
	for (const move of (section(voice, "Moves") ?? "").split(/^- /m).slice(1)) {
		const lines = quoted(move);
		if (lines.length > 1)
			throw new Error(
				`A move quotes at most one real line: "${lines[0].slice(0, 60)}".`,
			);
		for (const line of lines) {
			if (line.length > MOST_LINE_CHARACTERS)
				throw new Error(
					`A real line in Moves is at most ${MOST_LINE_CHARACTERS} characters: "${line.slice(0, 60)}".`,
				);
			if (!observations.some((o) => o.trait.includes(`"${line}"`)))
				throw new Error(
					`The line "${line.slice(0, 60)}" in Moves needs an observation citing where it comes from.`,
				);
		}
	}
}

/** A section's text without its heading, or undefined when the profile has none. */
export function section(voice: string, name: string): string | undefined {
	const start = voice.indexOf(`\n## ${name}\n`);
	if (start < 0) return undefined;
	const body = voice.slice(start + name.length + 5);
	const next = body.search(/^## /m);
	return (next < 0 ? body : body.slice(0, next)).trim();
}

/** An ordinary point, and how the voice would handle it. */
export interface Example {
	readonly point: string;
	readonly draft: string;
}
export const LEAST_EXAMPLES = 12;
const EXAMPLE = /^- \*\*Point:\*\* (.+)\n {2}\*\*Draft:\*\* (.+(?:\n {2}.*)*)$/gmu;

/** The Examples section's pool, each `- **Point:** ...` with its `**Draft:** ...` indented below. */
export function examplesOf(voice: string): Example[] {
	return [...(section(voice, "Examples") ?? "").matchAll(EXAMPLE)].map(
		([, point, draft]) => ({
			point: point.trim(),
			draft: draft.replace(/\n {2}/g, "\n").trim(),
		}),
	);
}

const WORD = /[\p{L}\p{N}]+(?:['’]\p{L}+)*/gu;
/** A draft's first two words, in lower case: what "a different opening" is measured by. */
export function openingOf(text: string): string {
	return (text.match(WORD) ?? []).slice(0, 2).join(" ").toLowerCase();
}
/**
 * How a draft ends: its last word in lower case, and the marks and emoji it closes on after
 * that word, empty when that is a plain full stop, question mark or exclamation mark.
 */
export function endingOf(text: string): { word: string; tail: string } {
	const last = [...text.trim().matchAll(WORD)].at(-1);
	const tail = (
		last ? text.trim().slice(last.index + last[0].length) : ""
	).replace(/\s+/g, "");
	return {
		word: last?.[0].toLowerCase() ?? "",
		tail: /^[.!?]?$/u.test(tail) ? "" : tail,
	};
}

/** A text's words in lower case, so a phrase is found in it whatever its case and marks. */
const words = (text: string) =>
	(text.replaceAll("’", "'").match(WORD) ?? []).map((w) => w.toLowerCase());
const within = (text: string, phrase: string) =>
	` ${words(text).join(" ")} `.includes(` ${words(phrase).join(" ")} `);

/** At most this share of the pool lands a signature, so the pool teaches the voice, not a line on the end. */
export const MOST_SIGNED_SHARE = 1 / 4;
/** A run of three words in more drafts than this is a pet phrase, which the writer learns as a reflex. */
export const MOST_DRAFTS_PER_PHRASE = 2;

/**
 * The writer copies the pool's shape more than any instruction, so the pool holds what a draft
 * should do: every opening and ending different, a signature in a few drafts and one at most,
 * never a real line from Moves, and no pet phrase across many drafts. `size` is the pool the
 * signature share is counted against, so a pool can be checked while it is being picked.
 */
export function checkPool(
	examples: readonly Example[],
	signatures: readonly Signature[],
	lines: readonly string[],
	size = examples.length,
) {
	const seen = new Map<string, string>();
	const once = (kind: string, value: string, draft: string) => {
		if (!value) return;
		const prior = seen.get(`${kind}:${value}`);
		if (prior !== undefined)
			throw new Error(
				`Two examples share the ${kind} "${value}": "${prior.slice(0, 60)}" and "${draft.slice(0, 60)}".`,
			);
		seen.set(`${kind}:${value}`, draft);
	};
	for (const { point, draft } of examples) {
		if (point.length > 300 || draft.length > 700)
			throw new Error(
				`An example is too long: a point is at most 300 characters and a draft 700. "${point.slice(0, 60)}"`,
			);
		if (draft.includes("—") || point.includes("—"))
			throw new Error("An example uses an em dash.");
		if (/\S {2,}\S/.test(draft))
			throw new Error(
				`An example has a doubled space: "${draft.slice(0, 60)}".`,
			);
		const { word, tail } = endingOf(draft);
		once("opening", openingOf(draft), draft);
		once("last word", word, draft);
		once("closing marks", tail, draft);
	}
	let signed = 0;
	for (const { draft } of examples) {
		const found = signatures.filter((g) => within(draft, g.phrase));
		// A line inside a longer one ("Believe." in "Do you believe in miracles?") lands with it.
		const landed = found.filter(
			(g) => !found.some((h) => h !== g && within(h.phrase, g.phrase)),
		);
		if (landed.length > 1)
			throw new Error(
				`An example lands two signatures, "${landed[0].phrase}" and "${landed[1].phrase}".`,
			);
		signed += landed.length;
	}
	if (signed > size * MOST_SIGNED_SHARE)
		throw new Error(
			`At most a quarter of the examples land a signature; ${signed} of ${size} do.`,
		);
	const phrases = new Set(signatures.map((g) => words(g.phrase).join(" ")));
	for (const line of lines.filter(
		(l) => words(l).length >= 3 && !phrases.has(words(l).join(" ")),
	))
		if (examples.some((e) => within(e.draft, line)))
			throw new Error(
				`An example uses the real line "${line.slice(0, 60)}": a line in Moves shows a move's shape, never an example's words.`,
			);
	const drafts = new Map<string, number>();
	for (const { draft } of examples) {
		const w = words(draft);
		const runs = new Set(w.slice(2).map((_, i) => w.slice(i, i + 3).join(" ")));
		for (const run of runs) drafts.set(run, (drafts.get(run) ?? 0) + 1);
	}
	for (const [run, n] of drafts)
		if (n > MOST_DRAFTS_PER_PHRASE)
			throw new Error(
				`"${run}" appears in ${n} examples; a phrase in more than ${MOST_DRAFTS_PER_PHRASE} becomes a reflex.`,
			);
}

/** The Examples section: every entry a point with its draft, and enough of them. */
function checkExamples(voice: string, examples: readonly Example[]) {
	const entries = (section(voice, "Examples") ?? "").match(/^- /gm) ?? [];
	if (entries.length !== examples.length)
		throw new Error(
			"Every example is `- **Point:** ...` with `**Draft:** ...` indented on the line below.",
		);
	if (examples.length < LEAST_EXAMPLES)
		throw new Error(
			`VOICE.md needs at least ${LEAST_EXAMPLES} examples; it has ${examples.length}.`,
		);
}

/**
 * What a voice shows: a message of at least two sentences, with the specifics the draft can play with, and a draft
 * that keeps them. Like the pool, it never uses a real line from Moves that is not also a signature, and has no em
 * dash or doubled space. The length is whatever the voice needs.
 */
function checkShown(
	shown: NonNullable<Metadata["comparison"]>,
	signatures: readonly Signature[],
	lines: readonly string[],
) {
	const { message, text } = shown;
	if (message.includes("—") || text.includes("—"))
		throw new Error("The example uses an em dash.");
	if (/\S {2,}\S/.test(message) || /\S {2,}\S/.test(text))
		throw new Error("The example has a doubled space.");
	if ((message.match(/[.!?](\s|$)/g) ?? []).length < 2)
		throw new Error(
			"The example's message is at least two sentences: give the voice something to work with.",
		);
	const phrases = new Set(signatures.map((g) => words(g.phrase).join(" ")));
	for (const line of lines.filter(
		(l) => words(l).length >= 3 && !phrases.has(words(l).join(" ")),
	))
		if (within(text, line))
			throw new Error(
				`The example uses the real line "${line.slice(0, 60)}": a line in Moves shows a move's shape, never the example's words.`,
			);
}

export function validateProfile(
	metadata: unknown,
	voice: string,
): VoiceProfile {
	const m = metadataSchema.parse(metadata);
	if (
		Buffer.byteLength(voice) > 40_000 ||
		voice.length < 1000 ||
		voice.includes("\r")
	)
		throw new Error(
			"VOICE.md must be substantial, bounded UTF-8 text with LF newlines.",
		);
	for (const name of sections)
		if (!section(voice, name))
			throw new Error(`VOICE.md is missing ${name}.`);
	const signatures = signaturesOf(voice);
	const examples = examplesOf(voice);
	checkSignatures(voice, signatures);
	checkExamples(voice, examples);
	checkLines(voice, m.observations);
	checkPool(examples, signatures, linesOf(voice));
	checkShown(m.example, signatures, linesOf(voice));
	if ((m.featured === undefined) !== (m.comparison === undefined))
		throw new Error(
			"A featured voice has a comparison, and only a featured voice does.",
		);
	if (m.comparison) checkShown(m.comparison, signatures, linesOf(voice));
	const lookalikes = new Set(m.lookalikes.map((n) => n.toLowerCase()));
	if (lookalikes.size !== m.lookalikes.length || lookalikes.has(m.name.toLowerCase()))
		throw new Error(
			"Lookalikes are other people, each named once, never the voice itself.",
		);
	const aliases = new Set(m.aliases);
	if (aliases.size !== (m.aliases?.length ?? 0) || aliases.has(m.name.toLowerCase()))
		throw new Error(
			"Aliases are other names, each given once, never the voice's own name.",
		);
	const sources = new Set(m.sources.map((s) => s.id));
	if (sources.size !== m.sources.length)
		throw new Error("Duplicate source ID.");
	for (const observation of m.observations)
		for (const id of observation.sourceIds)
			if (!sources.has(id))
				throw new Error("Observation cites an unknown source.");
	return { metadata: m, voice };
}
export async function readProfiles(directory: string): Promise<VoiceProfile[]> {
	const entries = (await readdir(directory, { withFileTypes: true }))
		.filter((e) => e.isDirectory())
		.sort((a, b) => a.name.localeCompare(b.name));
	const profiles = await Promise.all(
		entries.map(async (e) => {
			const result = validateProfile(
				JSON.parse(
					await readFile(join(directory, e.name, "profile.json"), "utf8"),
				),
				await readFile(join(directory, e.name, "VOICE.md"), "utf8"),
			);
			if (result.metadata.slug !== e.name)
				throw new Error("Profile slug differs from directory.");
			return result;
		}),
	);
	const messages = profiles.map((p) => p.metadata.example.message);
	if (new Set(messages).size !== messages.length)
		throw new Error(
			"Two profiles share an example message: every voice gets its own.",
		);
	const compared = new Set(
		profiles.flatMap((p) => p.metadata.comparison?.message ?? []),
	);
	if (compared.size > 1)
		throw new Error("The featured voices' comparison shares one message.");
	const ranks = profiles.flatMap((p) => p.metadata.featured ?? []);
	if (new Set(ranks).size !== ranks.length)
		throw new Error("Two profiles share a featured place.");
	return profiles;
}

/** The featured voices, in their places. */
export const featuredOf = <P extends VoiceProfile>(profiles: P[]): P[] =>
	profiles
		.filter((p) => p.metadata.verified && p.metadata.featured !== undefined)
		.toSorted((a, b) => a.metadata.featured! - b.metadata.featured!);
