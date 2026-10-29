import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	type Medium,
	type Metadata,
	readProfiles,
	type VoiceProfile,
} from "../spec/voice/v1/profile.ts";

const start = "<!-- catalogue:start -->";
const end = "<!-- catalogue:end -->";
const demoStart = /<!-- demo:start ([a-z0-9 -]+) -->/;
const demoEnd = "<!-- demo:end -->";
const media: Record<Medium, [string, string]> = {
	essay: ["essay", "essays"],
	transcript: ["transcript", "transcripts"],
	speech: ["speech", "speeches"],
	letter: ["letter", "letters"],
	post: ["post", "posts"],
	fiction: ["work of fiction", "works of fiction"],
	play: ["play", "plays"],
	poem: ["poem", "poems"],
};

function studied({ metadata }: VoiceProfile): string {
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

function table(profiles: VoiceProfile[], base: string): string {
	const rows = profiles
		.toSorted((a, b) => a.metadata.name.localeCompare(b.metadata.name))
		.map(
			(p) =>
				`| [**${p.metadata.name}**](${base}${p.metadata.slug}/VOICE.md) | ${p.metadata.description.split(/(?<=\.)\s/)[0]} | ${studied(p)} | ${p.metadata.evaluation === "unbenchmarked" ? "Draft" : "Admitted"} |`,
		);
	return [
		"| Voice | The move | Studied | Status |",
		"| --- | --- | --- | --- |",
		...rows,
	].join("\n");
}

const demoSlugs = (readme: string): string[] => {
	const open = readme.match(demoStart);
	if (!open) throw new Error("README has no demo markers.");
	return open[1].split(" ");
};

// The README lists the featured voices (the ones in its demo); profiles/README.md lists all of them.
export function catalogue(
	profiles: VoiceProfile[],
	featured: string[],
): string {
	return [
		start,
		table(
			profiles.filter((p) => featured.includes(p.metadata.slug)),
			"profiles/",
		),
		"",
		`Featured voices. All ${profiles.length} are listed in [\`profiles/\`](profiles/README.md).`,
		end,
	].join("\n");
}

export function fullCatalogue(profiles: VoiceProfile[]): string {
	return [
		"# Voices",
		"",
		`All ${profiles.length} voices in Silvertongue, generated from this folder by \`npm run catalogue\` and checked in CI. The featured ones are on the [main page](../README.md).`,
		"",
		table(profiles, ""),
		"",
	].join("\n");
}

export function withCatalogue(readme: string, table: string): string {
	const from = readme.indexOf(start);
	const to = readme.indexOf(end);
	if (from < 0 || to < from)
		throw new Error("README has no catalogue markers.");
	return readme.slice(0, from) + table + readme.slice(to + end.length);
}

const html = (text: string) =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function demo(profiles: VoiceProfile[], slugs: string[]): string {
	const voices = slugs.map((slug): Metadata => {
		const p = profiles.find((p) => p.metadata.slug === slug);
		if (!p) throw new Error(`Demo voice ${slug} is not in profiles/.`);
		return p.metadata;
	});
	const brief = voices[0].illustration.brief;
	if (voices.some((v) => v.illustration.brief !== brief))
		throw new Error("Demo voices must share one illustration brief.");
	const perRow =
		voices.length <= 4 ? voices.length : voices.length % 4 === 0 ? 4 : 3;
	const width = Math.floor(100 / Math.min(voices.length, perRow));
	const cell = (text: string) =>
		text
			.split(/\n{2,}/)
			.map((p) => `<p>${html(p).replaceAll("\n", "<br>")}</p>`)
			.join("\n");
	const rows: string[] = [];
	for (let i = 0; i < voices.length; i += perRow) {
		const row = voices.slice(i, i + perRow);
		rows.push(
			"<tr>",
			...row.map(
				(v) =>
					`<th width="${width}%"><a href="profiles/${v.slug}/VOICE.md">${v.name}</a></th>`,
			),
			"</tr>",
			"<tr>",
			...row.map(
				(v) => `<td valign="top">\n${cell(v.illustration.text)}\n</td>`,
			),
			"</tr>",
		);
	}
	return [`> **The brief:** ${brief}`, "", "<table>", ...rows, "</table>"].join(
		"\n",
	);
}

export function withDemo(readme: string, profiles: VoiceProfile[]): string {
	const open = readme.match(demoStart);
	const to = readme.indexOf(demoEnd);
	if (open?.index === undefined || to < open.index)
		throw new Error("README has no demo markers.");
	const from = open.index + open[0].length;
	return `${readme.slice(0, from)}\n${demo(profiles, demoSlugs(readme))}\n${readme.slice(to)}`;
}

export function render(readme: string, profiles: VoiceProfile[]): string {
	return withDemo(
		withCatalogue(readme, catalogue(profiles, demoSlugs(readme))),
		profiles,
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const readme = new URL("../README.md", import.meta.url);
	const profiles = await readProfiles(
		new URL("../profiles", import.meta.url).pathname,
	);
	await writeFile(readme, render(await readFile(readme, "utf8"), profiles));
	await writeFile(
		new URL("../profiles/README.md", import.meta.url),
		fullCatalogue(profiles),
	);
}
