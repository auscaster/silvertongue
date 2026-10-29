import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createBridge, endpointFrom } from "../dist/bridge.js";

const tool = {
	name: "search_voices",
	description: "Search voices.",
	inputSchema: { type: "object", properties: { query: { type: "string" } } },
};
// A hosted endpoint on the handshake era: what the bridge relays, and every method it was asked.
async function hosted() {
	const asked = [];
	const results = {
		initialize: (params) => ({
			protocolVersion: params.protocolVersion,
			capabilities: { tools: {}, resources: {}, prompts: {} },
			serverInfo: { name: "silvertongue", version: "9.9.9" },
			instructions: "Hosted instructions.",
		}),
		"tools/list": () => ({ tools: [tool] }),
		"tools/call": (params) => ({
			content: [{ type: "text", text: `found ${params.arguments.query}` }],
		}),
		"resources/list": () => ({
			resources: [{ uri: "https://example.com/voices/cher/VOICE.md", name: "cher" }],
		}),
		"resources/templates/list": () => ({
			resourceTemplates: [{ uriTemplate: "https://example.com/voices/{slug}/VOICE.md", name: "voice" }],
		}),
		"resources/read": (params) => ({
			contents: [{ uri: params.uri, mimeType: "text/markdown", text: "# Cher" }],
		}),
		"prompts/list": () => ({ prompts: [{ name: "write_as" }] }),
		"prompts/get": (params) => ({
			messages: [{ role: "user", content: { type: "text", text: `as ${params.arguments.voice}` } }],
		}),
		ping: () => ({}),
	};
	const server = createServer(async (req, res) => {
		// No stream and no sessions: GET and DELETE are refused, as Streamable HTTP allows.
		if (req.method !== "POST") {
			res.writeHead(405, { allow: "POST" }).end();
			return;
		}
		let body = "";
		for await (const chunk of req) body += chunk;
		const message = JSON.parse(body);
		if (message.id === undefined) {
			res.writeHead(202).end();
			return;
		}
		asked.push(message.method);
		const result = results[message.method]?.(message.params ?? {});
		res.writeHead(200, { "content-type": "application/json" });
		res.end(
			JSON.stringify(
				result
					? { jsonrpc: "2.0", id: message.id, result }
					: { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Method not found" } },
			),
		);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	return { url: new URL(`http://127.0.0.1:${server.address().port}/mcp`), asked, close: () => server.close() };
}

test("the endpoint is the hosted one, or HTTPS, or loopback", () => {
	assert.equal(endpointFrom({}).href, "https://silvertongue.auscaster.com/mcp");
	assert.equal(endpointFrom({ SILVERTONGUE_MCP_URL: "http://127.0.0.1:9/mcp" }).port, "9");
	assert.throws(() => endpointFrom({ SILVERTONGUE_MCP_URL: "http://example.com/mcp" }), /HTTPS/);
	assert.throws(() => endpointFrom({ SILVERTONGUE_MCP_URL: "https://u:p@example.com/mcp" }), /credentials/);
});

test("tools, resources and prompts are relayed, and resources and prompts are read live", async () => {
	const upstream = await hosted();
	const bridge = await createBridge({ endpoint: upstream.url });
	const [local, remote] = InMemoryTransport.createLinkedPair();
	await bridge.connect(remote);
	const client = new Client({ name: "test", version: "1.0.0" });
	try {
		await client.connect(local);
		assert.match(client.getInstructions(), /relaying the hosted Silvertongue server silvertongue@9\.9\.9/);
		assert.deepEqual((await client.listTools()).tools.map((t) => t.name), ["search_voices"]);
		const called = await client.callTool({ name: "search_voices", arguments: { query: "roast" } });
		assert.equal(called.content[0].text, "found roast");
		const uri = "https://example.com/voices/cher/VOICE.md";
		assert.equal((await client.listResources()).resources[0].uri, uri);
		assert.equal((await client.listResourceTemplates()).resourceTemplates[0].name, "voice");
		assert.equal((await client.readResource({ uri })).contents[0].text, "# Cher");
		assert.equal((await client.listPrompts()).prompts[0].name, "write_as");
		const prompt = await client.getPrompt({ name: "write_as", arguments: { voice: "cher" } });
		assert.equal(prompt.messages[0].content.text, "as cher");
		await client.listResources();
		assert.equal(upstream.asked.filter((m) => m === "resources/list").length, 2);
		assert.equal(upstream.asked.filter((m) => m === "tools/list").length, 1);
	} finally {
		await client.close();
		await bridge.close();
		upstream.close();
	}
});
