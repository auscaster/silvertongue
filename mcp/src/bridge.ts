import {
	type CallToolResult,
	Client,
	StreamableHTTPClientTransport,
	type Tool,
	type Transport,
} from "@modelcontextprotocol/client";
import { type Implementation, Server } from "@modelcontextprotocol/server";
import registry from "../server.json" with { type: "json" };
import manifest from "../package.json" with { type: "json" };

/** This process, as clients see it: the registry entry's identity at the installed version. */
export const bridgeImplementation: Implementation = {
	name: manifest.name,
	title: registry.title,
	version: manifest.version,
	description: registry.description,
	icons: registry.icons,
	websiteUrl: registry.websiteUrl,
};

const timeouts = { connect: 15_000, list: 15_000, call: 60_000, close: 5_000 };
const within = (timeout: number) => ({ timeout, maxTotalTimeout: timeout }) as const;

export interface Bridge {
	readonly tools: readonly Tool[];
	connect(transport: Transport): Promise<void>;
	close(): Promise<void>;
}

/**
 * A local stdio server that relays the hosted one. Tool definitions are read once at start, as
 * they change only with a hosted deploy; resources and prompts are read live on every request,
 * since a new release adds voices without one.
 */
export async function createBridge(input: {
	endpoint: URL;
	diagnostic?: (message: string) => void;
	onUpstreamClose?: () => void;
}): Promise<Bridge> {
	const upstream = new Client(bridgeImplementation, {
		capabilities: {},
		versionNegotiation: { mode: "legacy" },
	});
	let closing = false;
	upstream.onerror = (error) => input.diagnostic?.(`upstream error: ${error.message}`);
	upstream.onclose = () => {
		if (!closing) input.onUpstreamClose?.();
	};
	await upstream.connect(
		new StreamableHTTPClientTransport(input.endpoint),
		within(timeouts.connect),
	);
	const listed = await upstream.listTools(undefined, {
		...within(timeouts.list),
		cacheMode: "refresh",
	});
	if (listed.tools.length === 0) {
		await upstream.close();
		throw new Error("The hosted Silvertongue server returned no tools.");
	}
	const tools = Object.freeze([...listed.tools]);
	const byName = new Map(tools.map((tool) => [tool.name, tool]));
	const hosted = upstream.getServerVersion();
	const server = new Server(bridgeImplementation, {
		capabilities: {
			tools: { listChanged: false },
			resources: { listChanged: false },
			prompts: { listChanged: false },
		},
		instructions: [
			`This local process is ${bridgeImplementation.name}@${bridgeImplementation.version}, relaying the hosted Silvertongue server${hosted ? ` ${hosted.name}@${hosted.version}` : ""}.`,
			upstream.getInstructions(),
		]
			.filter(Boolean)
			.join(" "),
	});
	const live = { ...within(timeouts.list), cacheMode: "refresh" } as const;

	server.setRequestHandler("tools/list", () => ({ tools: [...tools] }));
	server.setRequestHandler("tools/call", async (request): Promise<CallToolResult> => {
		const tool = byName.get(request.params.name);
		if (!tool) throw new Error(`Unknown Silvertongue tool: ${request.params.name}.`);
		const result = await upstream.callTool(request.params, {
			...within(timeouts.call),
			toolDefinition: tool,
		});
		return server.projectCallToolResult(result, tool.outputSchema);
	});
	server.setRequestHandler("resources/list", (request) =>
		upstream.listResources(request.params, live),
	);
	server.setRequestHandler("resources/templates/list", (request) =>
		upstream.listResourceTemplates(request.params, live),
	);
	server.setRequestHandler("resources/read", (request) =>
		upstream.readResource(request.params, live),
	);
	server.setRequestHandler("prompts/list", (request) =>
		upstream.listPrompts(request.params, live),
	);
	server.setRequestHandler("prompts/get", (request) =>
		upstream.getPrompt(request.params, within(timeouts.call)),
	);

	return {
		tools,
		connect: (transport) => server.connect(transport),
		close: async () => {
			if (closing) return;
			closing = true;
			await Promise.allSettled([
				bounded(() => server.close()),
				bounded(() => upstream.close()),
			]);
		},
	};
}

/** The hosted endpoint, or SILVERTONGUE_MCP_URL: HTTPS, or plain HTTP on loopback for tests. */
export function endpointFrom(environment: NodeJS.ProcessEnv): URL {
	const endpoint = new URL(
		environment.SILVERTONGUE_MCP_URL ?? registry.remotes[0].url,
	);
	const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(endpoint.hostname);
	if (endpoint.username || endpoint.password || endpoint.hash)
		throw new Error("SILVERTONGUE_MCP_URL must not carry credentials or a fragment.");
	if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback))
		throw new Error("SILVERTONGUE_MCP_URL must use HTTPS, except on loopback.");
	return endpoint;
}

async function bounded(close: () => Promise<void>) {
	let timer: NodeJS.Timeout | undefined;
	try {
		await Promise.race([
			close(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error("Close timed out.")), timeouts.close);
				timer.unref();
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
