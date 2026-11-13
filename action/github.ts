// The pull request, read through GitHub's API with the job's own token, and its code fetched at the head
// commit so the audit can read and search it. Nothing in the pull request is ever run.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Repo { owner: string; name: string }

export interface Pull {
	number: number;
	title: string;
	body: string;
	author: string;
	url: string;
	headSha: string;
	baseRef: string;
	baseSha: string;
	additions: number;
	deletions: number;
	changedFiles: number;
	draft: boolean;
}

export interface File {
	path: string;
	status: string;
	additions: number;
	deletions: number;
	patch?: string;
}

export interface Issue { number: number; title: string; body: string }

export interface ReviewComment { path: string; line: number; side: "RIGHT"; body: string }

export class GitHub {
	readonly repo: Repo;
	readonly token: string;
	readonly api: string;
	readonly server: string;
	constructor(repo: Repo, token: string) {
		this.repo = repo;
		this.token = token;
		this.api = process.env.GITHUB_API_URL ?? "https://api.github.com";
		this.server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	}

	private async request(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
		const res = await fetch(`${this.api}${path}`, {
			method,
			headers: { authorization: `Bearer ${this.token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "silvertongue-review", ...(body ? { "content-type": "application/json" } : {}) },
			body: body ? JSON.stringify(body) : undefined,
		});
		const text = await res.text();
		let data: unknown = text;
		try { data = JSON.parse(text); } catch { /* keep the text */ }
		return { status: res.status, data };
	}

	private async get<T>(path: string): Promise<T> {
		const { status, data } = await this.request("GET", path);
		if (status !== 200) throw new Error(`GitHub answered ${status} for ${path}: ${(data as { message?: string }).message ?? String(data).slice(0, 300)}`);
		return data as T;
	}

	private base() { return `/repos/${this.repo.owner}/${this.repo.name}`; }

	async pull(number: number): Promise<Pull> {
		const p = await this.get<{ title: string; body: string | null; user: { login: string }; html_url: string; head: { sha: string }; base: { ref: string; sha: string }; additions: number; deletions: number; changed_files: number; draft: boolean }>(`${this.base()}/pulls/${number}`);
		return { number, title: p.title, body: p.body ?? "", author: p.user.login, url: p.html_url, headSha: p.head.sha, baseRef: p.base.ref, baseSha: p.base.sha, additions: p.additions, deletions: p.deletions, changedFiles: p.changed_files, draft: p.draft };
	}

	async files(number: number): Promise<File[]> {
		const out: File[] = [];
		for (let page = 1; page <= 30; page++) {
			const batch = await this.get<{ filename: string; status: string; additions: number; deletions: number; patch?: string }[]>(`${this.base()}/pulls/${number}/files?per_page=100&page=${page}`);
			out.push(...batch.map((f) => ({ path: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch })));
			if (batch.length < 100) break;
		}
		return out;
	}

	/** Issues the description says it closes, in this repository. */
	async linkedIssues(body: string): Promise<Issue[]> {
		const numbers = [...new Set([...body.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1])))].slice(0, 3);
		const out: Issue[] = [];
		for (const n of numbers) {
			try {
				const i = await this.get<{ title: string; body: string | null }>(`${this.base()}/issues/${n}`);
				out.push({ number: n, title: i.title, body: i.body ?? "" });
			} catch { /* a closed or missing issue is not a reason to stop the review */ }
		}
		return out;
	}

	async review(number: number, review: { commit_id: string; body: string; event: "COMMENT" | "REQUEST_CHANGES"; comments: ReviewComment[] }): Promise<{ status: number; url?: string; message?: string }> {
		const { status, data } = await this.request("POST", `${this.base()}/pulls/${number}/reviews`, review);
		const d = data as { html_url?: string; message?: string; errors?: unknown };
		return { status, url: d.html_url, message: d.message ? `${d.message}${d.errors ? ` ${JSON.stringify(d.errors)}` : ""}` : undefined };
	}

	/** A real Git checkout with both pinned commits and their ancestry. No PR code, hooks or filters run. */
	fetchSource(head: string, base: string): Source {
		const dir = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "silvertongue-"));
		const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1" };
		const git = (...args: string[]) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "credential.helper=", ...args], { cwd: dir, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
		git("init", "-q");
		git("remote", "add", "origin", `${this.server}/${this.repo.owner}/${this.repo.name}.git`);
		const auth = Buffer.from(`x-access-token:${this.token}`).toString("base64");
		try {
			git("-c", `http.extraHeader=Authorization: Basic ${auth}`, "fetch", "-q", "--no-tags", "origin", head, base);
		} catch (error) {
			// execFileSync's default message includes argv, including the one-shot authorization header.
			const reason = String((error as { stderr?: unknown }).stderr ?? "Could not fetch the pinned commits.").replaceAll(this.token, "[redacted]").replaceAll(auth, "[redacted]");
			throw new Error(`Git could not fetch the review source: ${reason.trim().slice(-500)}`);
		}
		git("update-ref", "refs/silvertongue/head", head);
		git("update-ref", "refs/silvertongue/base", base);
		git("merge-base", head, base); // fail before invoking a reviewer if the comparison cannot be established
		git("-c", "filter.lfs.smudge=", "-c", "filter.lfs.process=", "-c", "filter.lfs.required=false", "checkout", "-q", "--detach", head);
		return new Source(git, dir, head);
	}
}

export class Source {
	private readonly git: (...args: string[]) => string;
	private readonly dir: string;
	private readonly head: string;
	constructor(git: (...args: string[]) => string, dir: string, head: string) {
		this.git = git;
		this.dir = dir;
		this.head = head;
	}

	/** Native reviewers need Git history as well as files. The checkout is pinned to the audited head. */
	checkout(): string { return this.dir; }

	exists(path: string): boolean {
		try { this.git("cat-file", "-e", `${this.head}:${path}`); return true; } catch { return false; }
	}

	read(path: string): string {
		return this.git("show", `${this.head}:${path}`);
	}

	list(path: string): string[] {
		return this.git("ls-tree", "-r", "--name-only", this.head, "--", path || ".").split("\n").filter(Boolean);
	}

	/** git grep over the head commit; an empty result is an answer, not an error. */
	search(pattern: string, path: string): string[] {
		try {
			return this.git("grep", "-n", "-I", "-E", "--max-count=25", "-e", pattern, this.head, "--", path || ".")
				.split("\n").filter(Boolean).map((l) => l.slice(this.head.length + 1));
		} catch (e) {
			if ((e as { status?: number }).status === 1) return [];
			throw new Error(`search failed: ${((e as { stderr?: string }).stderr ?? String(e)).trim().slice(0, 300)}`);
		}
	}
}

/** Lines on the new side of a patch that a review comment can be attached to. */
export function commentableLines(patch: string | undefined): Set<number> {
	const lines = new Set<number>();
	if (!patch) return lines;
	let line = 0;
	for (const l of patch.split("\n")) {
		const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
		if (hunk) { line = Number(hunk[1]); continue; }
		if (l.startsWith("-") || l.startsWith("\\")) continue;
		lines.add(line);
		line++;
	}
	return lines;
}
