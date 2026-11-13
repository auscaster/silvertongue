// JSON over HTTPS for the model providers. node:https rather than fetch, because a long reasoning turn can
// outlast fetch's fixed five-minute wait for response headers.
import { request } from "node:https";

export interface Reply {
	status: number;
	body: unknown;
	text: string;
}

function once(url: string, headers: Record<string, string>, payload: string, timeoutMs: number): Promise<Reply> {
	return new Promise((resolve, reject) => {
		const req = request(url, { method: "POST", headers: { ...headers, "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) } }, (res) => {
			const chunks: Buffer[] = [];
			res.on("data", (c: Buffer) => chunks.push(c));
			res.on("end", () => {
				const text = Buffer.concat(chunks).toString("utf8");
				let body: unknown = undefined;
				try { body = JSON.parse(text); } catch { /* the status and text still say what went wrong */ }
				resolve({ status: res.statusCode ?? 0, body, text });
			});
			res.on("error", reject);
		});
		req.setTimeout(timeoutMs, () => req.destroy(new Error(`no answer from ${new URL(url).host} in ${Math.round(timeoutMs / 60000)} minutes`)));
		req.on("error", reject);
		req.end(payload);
	});
}

/** POST JSON, retrying the answers that mean "try again" (rate limits, overload, a dropped connection). */
export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 14 * 60_000): Promise<Reply> {
	const payload = JSON.stringify(body);
	for (let attempt = 1; ; attempt++) {
		let reply: Reply | undefined;
		let failure: unknown;
		try { reply = await once(url, headers, payload, timeoutMs); } catch (e) { failure = e; }
		const retry = failure !== undefined || (reply !== undefined && [408, 409, 429, 500, 502, 503, 504, 529].includes(reply.status));
		if (!retry && reply) return reply;
		if (attempt >= 4) {
			if (reply) return reply;
			throw failure;
		}
		await new Promise((r) => setTimeout(r, attempt * attempt * 4000));
	}
}

export function fail(provider: string, reply: Reply): never {
	const message = (reply.body as { error?: { message?: string } } | undefined)?.error?.message ?? reply.text.slice(0, 500);
	throw new Error(`${provider} answered ${reply.status}: ${message}`);
}
