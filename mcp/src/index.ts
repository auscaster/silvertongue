#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { type Bridge, createBridge, endpointFrom } from "./bridge.js";

const note = (message: string) => process.stderr.write(`[silvertongue] ${message}\n`);
let bridge: Bridge | undefined;
let stopping = false;

async function stop(reason: string, exitCode: number) {
	if (stopping) return;
	stopping = true;
	note(reason);
	await bridge?.close();
	process.exitCode = exitCode;
}

async function main() {
	const endpoint = endpointFrom(process.env);
	bridge = await createBridge({
		endpoint,
		diagnostic: note,
		onUpstreamClose: () => void stop("the hosted connection closed", 1),
	});
	for (const signal of ["SIGINT", "SIGTERM"] as const)
		process.once(signal, () => void stop(`received ${signal}`, 0));
	await bridge.connect(new StdioServerTransport());
	note(`relaying ${endpoint.origin}${endpoint.pathname}`);
}

main().catch((error: unknown) => {
	note(`failed to start: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
