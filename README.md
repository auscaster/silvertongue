# Silvertongue

**Write like anyone famous.**

Famous writing voices for your agent and your browser. Each voice is a
researched profile of how someone writes: stance, construction, rhythm, detail,
formats and restraint, tied to the public sources it studied. Your facts and your
point stay yours. The voice changes the delivery.

## Voices

| Voice | What it does | Evaluation |
| --- | --- | --- |
| [Derek Sivers](profiles/derek-sivers/VOICE.md) | A small story, a change of angle, something you can actually try. | Unbenchmarked |
| [Naval Ravikant](profiles/naval-ravikant/VOICE.md) | Reduce an idea to its mechanism, then its shortest useful form. | Unbenchmarked |
| [Paul Graham](profiles/paul-graham/VOICE.md) | Follow a small observation until it exposes a bigger problem. | Unbenchmarked |

## Use a voice

Every `VOICE.md` works on its own. Give one to any agent with your brief and the
facts you want kept.

## What's here

| Path | Contents | Status |
| --- | --- | --- |
| `profiles/` | Voice profiles, admitted by pull request | Three drafts |
| `spec/voice/v1/` | [Profile format](spec/voice/v1/README.md) and its validator | Exists |
| `skills/` | Agent skill | Planned |
| `.claude-plugin/`, `.codex-plugin/` | Agent plugin manifests | Planned |
| `mcp/` | stdio bridge to the hosted MCP server, `com.auscaster/silvertongue` on npm and the MCP Registry | Planned |

The skill and the MCP bridge call the hosted service and carry no prompts or model
keys. The browser extension is planned and will install from its stores.

## Contributing

Add or correct a voice with a pull request; see [CONTRIBUTING.md](CONTRIBUTING.md).
Report security issues privately; see [SECURITY.md](SECURITY.md).

## Licences

Code: [Apache-2.0](LICENSE). Profiles: [CC BY 4.0](PROFILE-LICENSE.md). Profiles are
unofficial studies of public writing; the people they name have not endorsed them.
The Silvertongue name and logo are not licensed; see [NOTICE](NOTICE).
