// The review as GitHub shows it: the opening in the voice, each finding on its own line with the plain fix
// and the evidence under it, and a line saying whose voice and which model.
import type { Audit } from "./audit.ts";
import { commentableLines, type File, type ReviewComment } from "./github.ts";
import type { Packet, Written } from "./voice.ts";

export interface Review {
	event: "COMMENT" | "REQUEST_CHANGES";
	body: string;
	comments: ReviewComment[];
}

const SEVERITY = { blocker: "Blocker", major: "Major", minor: "Minor" } as const;

export function compose(audit: Audit, written: Written, voice: Packet, model: string, files: File[], link: (path: string, line: number) => string, requestChanges: boolean): Review {
	const anchors = new Map(files.map((f) => [f.path, commentableLines(f.patch)]));
	const comments: ReviewComment[] = [];
	const elsewhere: string[] = [];
	audit.findings.forEach((f, i) => {
		const said = written.comments.find((c) => c.finding === i + 1)?.body.trim() || f.challenge;
		const detail = `<details><summary><b>${SEVERITY[f.severity]}</b>: the fix and the evidence</summary>\n\n**Fix.** ${f.remedy}\n\n**Evidence.** ${f.evidence}\n\n</details>`;
		if (anchors.get(f.path)?.has(f.line)) comments.push({ path: f.path, line: f.line, side: "RIGHT", body: `${said}\n\n${detail}` });
		else elsewhere.push(`- [\`${f.path}:${f.line}\`](${link(f.path, f.line)}) ${said}\n\n  ${detail.replace(/\n/g, "\n  ")}`);
	});
	const body = [
		written.summary.trim(),
		elsewhere.length ? `**Outside the lines this pull request changes**\n\n${elsewhere.join("\n\n")}` : "",
		`<sub>Written in the voice of ${voice.name} with [Silvertongue](https://silvertongue.dev), an unofficial study of how ${voice.name} writes. Every finding names a file and a line. Model: \`${model}\`.</sub>`,
	].filter(Boolean).join("\n\n");
	return { event: requestChanges && audit.verdict !== "accept" ? "REQUEST_CHANGES" : "COMMENT", body, comments };
}

/** The same review with every comment moved into the body, for when GitHub will not take them on their lines. */
export function flatten(review: Review, link: (path: string, line: number) => string): Review {
	if (review.comments.length === 0) return review;
	const listed = review.comments.map((c) => `- [\`${c.path}:${c.line}\`](${link(c.path, c.line)}) ${c.body.replace(/\n/g, "\n  ")}`).join("\n\n");
	const at = review.body.lastIndexOf("\n\n<sub>");
	return { ...review, comments: [], body: `${review.body.slice(0, at)}\n\n${listed}${review.body.slice(at)}` };
}

export function markdown(review: Review): string {
	const lines = [review.body];
	for (const c of review.comments) lines.push(`---\n**\`${c.path}:${c.line}\`**\n\n${c.body}`);
	return lines.join("\n\n");
}
