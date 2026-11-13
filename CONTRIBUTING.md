# Contributing

## Where things live

```
profiles/<slug>/   one voice: VOICE.md (the voice) and profile.json (its sources and observations)
spec/voice/v0/     the experimental profile format and validator
scripts/           the catalogue table in the README, generated from the profiles
test/              the validator and catalogue tests
assets/            the mark and wordmark
skills/            the agent skill every plugin below carries
action/            the pull request review Action: TypeScript Node runs as is, no dependencies
```

Every agent platform reads its own file from the repository root, so these stay there. They
all point at the same hosted MCP server, `https://mcp.silvertongue.dev/mcp`, and share the
skill and the icon; each holds only what its platform needs.

| File | Platform | Notes |
| --- | --- | --- |
| `.claude-plugin/plugin.json`, `.claude-plugin/icon.png` | Claude Code plugin, and Claude's plugin directory | The plugin's identity and icon. |
| `.mcp.json` | Claude Code and Cursor plugins | Their MCP server, in Claude Code's format (`"type": "http"`). |
| `.cursor-plugin/plugin.json` | Cursor plugin, and the Cursor Marketplace | Its identity; it takes the logo from `.claude-plugin/icon.png` and the server from `.mcp.json`. |
| `plugin.json`, `mcp.json` | Agent Plugins package: Codex and the ChatGPT plugin directory | The [Agent Plugins](https://agent-plugins.org) format (`"type": "streamable-http"`); `plugin.json` also carries ChatGPT's listing and review cases. The directory's package is these two files, `skills/` and the icon. |
| `gemini-extension.json` | Gemini CLI extension | Installed from the latest GitHub release. |
| `server.json` | Official MCP Registry | Published by `.github/workflows/registry.yml` on an `mcp-v<version>` tag. |
| `glama.json` | Glama | Claims the listing for its maintainers. |
| `action.yml` | GitHub Actions, and the GitHub Marketplace | The review Action's inputs and entry point, `action/main.ts`. It runs on the developer's own model key and asks the hosted server only for the voice's writing instructions. |

`.mcp.json` and `mcp.json` describe the same server for two different readers, so a change
to the endpoint changes both. `server.json` is versioned with the server's tool contract; the
plugin manifests with the plugin. Claude Code and Codex install the plugin through the
`auscaster/agent-plugins` marketplace, which points at this repository's root.

## Before a pull request

```sh
npm ci
npm run verify    # type check, then validate every profile
```

CI runs the same checks.

## Adding or correcting a voice

Each voice is `profiles/<slug>/VOICE.md` plus `profile.json`, in the
[v0 format](spec/voice/v0/README.md). [Writing a voice](spec/voice/v0/GUIDE.md) is how to
make one good, who can be a voice, and the bar every voice is held to.

`npm run verify` checks the format and the example pool. New community profiles use
`"verified": false`: they can merge here for review and improvement without appearing in
the app, MCP or extension catalogue. Maintainers set `verified` to `true` only after a
voice passes the blind-test quality bar. A material correction to a verified voice returns
it to `false` until it passes the bar and beats the voice as it stands. Verification is a
quality gate, separate from the profile's `unofficial` identity status.

No em dashes in a profile or its example. If a profile studies you and you want it removed, ask privately
through the [terms](https://silvertongue.dev/terms#removing-a-profile-that-studies-you): it
comes out within seven days, and no reason is needed.

## Licences

Profile contributions are licensed under CC BY 4.0 ([PROFILE-LICENSE.md](PROFILE-LICENSE.md));
code contributions under Apache-2.0 ([LICENSE](LICENSE)).
