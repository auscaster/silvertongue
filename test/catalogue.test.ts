import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fullCatalogue, render, withBar } from "../scripts/catalogue.ts";
import { readProfiles } from "../spec/voice/v0/profile.ts";

const profiles = await readProfiles(
	new URL("../profiles", import.meta.url).pathname,
);

test("README catalogue and demo match profiles/", async () => {
	const readme = await readFile(
		new URL("../README.md", import.meta.url),
		"utf8",
	);
	assert.equal(
		render(readme, profiles),
		readme,
		"Run npm run catalogue to regenerate the README catalogue and demo.",
	);
});

test("profiles/README.md lists every profile", async () => {
	const list = await readFile(
		new URL("../profiles/README.md", import.meta.url),
		"utf8",
	);
	assert.equal(
		fullCatalogue(profiles),
		list,
		"Run npm run catalogue to regenerate profiles/README.md.",
	);
});

test("the public catalogue lists pending community profiles without featuring them", () => {
	const featured = profiles.find((p) => p.metadata.featured !== undefined)!;
	const pending = {
		...featured,
		metadata: { ...featured.metadata, verified: false },
	};
	const list = fullCatalogue([pending]);
	assert.ok(list.includes(`(${pending.metadata.slug}/VOICE.md)`));
	assert.match(list, /\| Community \|/);
	const others = profiles.filter(
		(p) => p.metadata.slug !== pending.metadata.slug,
	);
	const demo = render(
		"<!-- catalogue:start -->\n<!-- catalogue:end -->\n<!-- demo:start -->\n<!-- demo:end -->",
		[...others, pending],
	);
	assert.ok(!demo.includes(`profiles/${pending.metadata.slug}/VOICE.md`));
});

test("GUIDE.md states the bar bar.ts applies", async () => {
	const guide = await readFile(
		new URL("../spec/voice/v0/GUIDE.md", import.meta.url),
		"utf8",
	);
	assert.equal(withBar(guide), guide, "Run npm run catalogue to regenerate the bar in GUIDE.md.");
});
