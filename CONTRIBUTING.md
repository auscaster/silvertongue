# Contributing

## Where things live

```
profiles/<slug>/   one voice: VOICE.md (the voice) and profile.json (its sources and observations)
spec/voice/v1/     the profile format, as a contract
scripts/           the catalogue table in the README, generated from the profiles
test/              the validator and catalogue tests
assets/            the mark and wordmark
skills/            the agent skill every plugin below carries
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
[v1 format](spec/voice/v1/README.md).

- Study a public figure's writing technique in the medium the voice is for: an
  essay corpus says little about someone's posts.
- Link every source over `https` and say what it shows. Never copy source text
  into the repository beyond a short quotation.
- Every observation cites the sources it rests on.
- Describe technique only. No invented quotations, opinions on new events,
  biography, relationships or endorsements, and nothing that claims to be the
  person.
- Politicians are studied for delivery only. Their sources and illustration
  avoid election and campaign material, and the profile forbids stating
  positions, endorsing anyone or writing about elections and voting.
- Deceased writers are accepted once a century has passed since their death.
- Fictional characters are studied from their own words in the books, films
  and shows they appear in. The profile borrows none of their world (places,
  companions, possessions) and none of their catchphrases.
- Comedy and roast profiles keep the comedian's edge: drugs, sex, death, crude
  language and personal insults about public or willing targets. They exclude
  racism and slurs, and never target private people.
- No em dashes in a profile or its illustration.
- Not accepted: private individuals, minors, and people whose public writing is
  mainly hate, harassment or incitement.

Maintainers admit new voices after review and a blind evaluation against a strong
name-only prompt. Corrections to an existing voice are welcome as ordinary pull
requests. If a profile studies you and you want it removed, ask privately through
the [terms](https://silvertongue.dev/terms#removing-a-profile-that-studies-you):
it comes out within seven days, and no reason is needed.

## Licences

Profile contributions are licensed under CC BY 4.0 ([PROFILE-LICENSE.md](PROFILE-LICENSE.md));
code contributions under Apache-2.0 ([LICENSE](LICENSE)).
