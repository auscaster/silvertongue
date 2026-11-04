import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fullCatalogue, render, withBar } from "../scripts/catalogue.ts";
import { readProfiles } from "../spec/voice/v3/profile.ts";

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

test("GUIDE.md states the bar bar.ts applies", async () => {
	const guide = await readFile(
		new URL("../spec/voice/v3/GUIDE.md", import.meta.url),
		"utf8",
	);
	assert.equal(withBar(guide), guide, "Run npm run catalogue to regenerate the bar in GUIDE.md.");
});
