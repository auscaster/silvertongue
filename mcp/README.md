# silvertongue

Famous writing voices for your agent, over MCP. This package is a small stdio bridge to the hosted
Silvertongue server, for MCP clients that only run local servers. Every voice, tool and prompt
comes live from the server, so new voices arrive without a new package.

Clients that take a remote server can skip this package and add
`https://mcp.silvertongue.dev/mcp` directly.

## Use it

```json
{
  "mcpServers": {
    "silvertongue": { "command": "npx", "args": ["-y", "silvertongue"] }
  }
}
```

Then ask your agent for a voice by name, or run the `write_as` prompt:

> Write my launch post as Theo Von, short, for X.

## What it serves

| | |
| --- | --- |
| `search_voices` | Find a voice by name, lane or what the writing should do |
| `get_voice` | The full profile, every source studied and the licence |
| `get_voice_packet` | Instructions for one format, length, platform, intensity and edge |
| `get_changes` | Voices added, re-studied and removed since your agent last looked |
| `write_as` | A prompt that switches voice and drafts in one command |
| Resources | Every voice's `VOICE.md` |

Everything is free, read-only and needs no account. Your own model does the writing.

Voices are unofficial studies of public writing technique. Nobody named wrote or endorsed them,
and a draft must never be presented as their words.

`SILVERTONGUE_MCP_URL` points the bridge at another endpoint (HTTPS, or HTTP on loopback).

More at [auscaster.com/silvertongue](https://auscaster.com/silvertongue); source on
[GitHub](https://github.com/auscaster/silvertongue). The bridge is Apache-2.0.
