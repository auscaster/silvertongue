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
]);
export type Medium = z.infer<typeof mediumSchema>;
const sourceSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9-]+$/),
		title: z.string().min(1),
		url: z.url().startsWith("https://"),
		published: z.string().min(4),
		medium: mediumSchema,
		note: z.string().min(20),
	})
	.strict();
export const metadataSchema = z
	.object({
		slug: z.string().regex(/^[a-z][a-z0-9-]{0,60}$/),
		name: z.string().min(1),
		description: z.string().min(20).max(220),
		scope: z.string().min(30),
		status: z.literal("unofficial"),
		evaluation: z.literal("unbenchmarked"),
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
		illustration: z
			.object({
				brief: z.string(),
				format: formatSchema,
				text: z.string(),
				kind: z.literal("editorial-illustration"),
			})
			.strict(),
	})
	.strict();
export type Metadata = z.infer<typeof metadataSchema>;
export interface VoiceProfile {
	metadata: Metadata;
	voice: string;
}
export const sections = [
	"Stance",
	"Construction",
	"Rhythm",
	"Detail",
	"Formats",
	"Restraint",
	"Facts and identity",
];
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
	for (const section of sections)
		if (!voice.includes(`\n## ${section}\n`))
			throw new Error(`VOICE.md is missing ${section}.`);
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
	return Promise.all(
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
}
