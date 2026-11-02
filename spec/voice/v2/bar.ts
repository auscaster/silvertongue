/**
 * The bar every voice is admitted against, and every change to a voice or to how drafts are
 * written is held to (GUIDE.md, "The bar"). The maintainers' evaluation writes the voice's drafts
 * with the writer that serves them, on the messages people actually send, has a judge that is not
 * the writer's own model read them, and counts. These are the counts, and what each must reach.
 */
export interface Measures {
	/** First drafts: each a different person's, with no drafts before it. */
	readonly first: number;
	/** First drafts the judge named the voice for, from the voice and its four lookalikes. */
	readonly recognisedFirst: number;
	/** Later drafts: Try again, pressed four more times by one person on each of three messages. */
	readonly later: number;
	readonly recognisedLater: number;
	/** First drafts the judge scored a banger: at least seven of ten. */
	readonly bangers: number;
	/** First drafts the judge preferred to a name-only prompt's draft on the same message. */
	readonly beatNameOnly: number;
	/** First drafts that keep the user's point, every fact and who is saying it to whom. */
	readonly pointKept: number;
	/** Drafts that add a fact the user never gave, or joke at someone receiving bad news. */
	readonly faults: number;
	/** First drafts that land one of the voice's lines, and the most first drafts any one line lands in. */
	readonly landed: number;
	readonly sameLine: number;
	/** Drafts, first and later, that land a line where the message is not plainly its situation. */
	readonly drafts: number;
	readonly tacked: number;
	/** The different takes in each Try-again set of five drafts. */
	readonly takes: readonly number[];
	/** The most first drafts that share an opening, a last word or a closing run of marks. */
	readonly sameShape: number;
}

/** One thing the bar checks: what it asks, in words, and whether the counts reach it. */
export interface Criterion {
	readonly name: string;
	readonly need: string;
	readonly value: (m: Measures) => string;
	readonly passes: (m: Measures) => boolean;
}

const SET = 5;
const of = (n: number, total: number) => `${n}/${total}`;
const percent = (share: number) => `${Math.round(share * 100)}%`;
const share = (n: number, total: number, least: number) =>
	total > 0 && n >= least * total;

/** A banger: funny or sharp on first read, unmistakably them, the line people screenshot. */
export const BANGER = 7;
const RECOGNISED_FIRST = 0.8;
const RECOGNISED_LATER = 0.7;
const BANGERS = 0.5;
const BEATS_NAME_ONLY = 0.7;
const MOST_LANDED = 0.25;
const MOST_SAME_LINE = 2;
const MOST_TACKED = 1 / 20;
const LEAST_TAKES = 3;
const LEAST_TAKES_IN_A_SET = 2;
const MOST_SAME_SHAPE = 2;

export const bar: readonly Criterion[] = [
	{
		name: "Known on the first draft",
		need: `At least ${percent(RECOGNISED_FIRST)} of first drafts are named as the voice by a judge choosing from it and its four lookalikes.`,
		value: (m) => of(m.recognisedFirst, m.first),
		passes: (m) => share(m.recognisedFirst, m.first, RECOGNISED_FIRST),
	},
	{
		name: "Known on Try again",
		need: `At least ${percent(RECOGNISED_LATER)} of later drafts are named the same way.`,
		value: (m) => of(m.recognisedLater, m.later),
		passes: (m) => share(m.recognisedLater, m.later, RECOGNISED_LATER),
	},
	{
		name: "Bangers",
		need: `At least ${percent(BANGERS)} of first drafts score ${BANGER} or more of 10: funny or sharp on first read with no setup beyond the message, unmistakably them, the kind of line people screenshot.`,
		value: (m) => of(m.bangers, m.first),
		passes: (m) => share(m.bangers, m.first, BANGERS),
	},
	{
		name: "Better than the name alone",
		need: `At least ${percent(BEATS_NAME_ONLY)} of first drafts beat a strong prompt that has only the voice's name, on the same message.`,
		value: (m) => of(m.beatNameOnly, m.first),
		passes: (m) => share(m.beatNameOnly, m.first, BEATS_NAME_ONLY),
	},
	{
		name: "Does the job",
		need: "Every first draft keeps the user's point, every fact in it, and who is saying it to whom.",
		value: (m) => of(m.pointKept, m.first),
		passes: (m) => m.first > 0 && m.pointKept === m.first,
	},
	{
		name: "Honest and kind",
		need: "No draft invents a fact a reader could believe (a day, a time, an amount the user never gave), or makes the joke on someone receiving bad news they did nothing to earn.",
		value: (m) => String(m.faults),
		passes: (m) => m.faults === 0,
	},
	{
		name: "Lines land rarely",
		need: `At most ${percent(MOST_LANDED)} of first drafts land one of the voice's lines, and no line lands in more than ${MOST_SAME_LINE}.`,
		value: (m) => `${of(m.landed, m.first)}, ${m.sameLine} at most`,
		passes: (m) =>
			m.landed <= MOST_LANDED * m.first && m.sameLine <= MOST_SAME_LINE,
	},
	{
		name: "Lines follow",
		need: `At most one draft in ${1 / MOST_TACKED} lands a line where the message is not plainly its situation.`,
		value: (m) => of(m.tacked, m.drafts),
		passes: (m) => m.tacked <= MOST_TACKED * m.drafts,
	},
	{
		name: "Range",
		need: `Try again gives at least ${LEAST_TAKES} different takes in ${SET} on average, and never fewer than ${LEAST_TAKES_IN_A_SET} in a set.`,
		value: (m) => m.takes.join(", "),
		passes: (m) =>
			m.takes.length > 0 &&
			m.takes.reduce((a, b) => a + b, 0) >= LEAST_TAKES * m.takes.length &&
			m.takes.every((t) => t >= LEAST_TAKES_IN_A_SET),
	},
	{
		name: "No set shape",
		need: `No opening, last word or closing run of marks appears in more than ${MOST_SAME_SHAPE} first drafts.`,
		value: (m) => String(m.sameShape),
		passes: (m) => m.sameShape <= MOST_SAME_SHAPE,
	},
];

/** A correction to a voice also has to beat the voice as it stands, on at least this share of first drafts. */
export const BEATS_CURRENT = 0.5;
export const improves = (won: number, of: number) => share(won, of, BEATS_CURRENT);

/** Each criterion, what the voice's counts reached, and whether it passes; a voice passes on all of them. */
export function verdict(m: Measures) {
	const rows = bar.map((c) => ({
		name: c.name,
		value: c.value(m),
		passes: c.passes(m),
	}));
	return { passes: rows.every((r) => r.passes), rows };
}
