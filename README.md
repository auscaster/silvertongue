<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/silvertongue-wordmark-light.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/silvertongue-wordmark-dark.svg">
  <img alt="Silvertongue" src="assets/silvertongue-wordmark-dark.png" width="400">
</picture>

<h3>Write like anyone famous.</h3>

An open catalogue of famous writing voices for your agent and your browser.<br>
Pick a voice. Switch any time. Keep your point.

[![CI](https://img.shields.io/github/actions/workflow/status/auscaster/silvertongue/ci.yml?branch=main&style=flat-square&label=ci&labelColor=111&color=111)](https://github.com/auscaster/silvertongue/actions/workflows/ci.yml)
[![Format: VOICE.md v1](https://img.shields.io/badge/format-VOICE.md%20v1-111?style=flat-square)](spec/voice/v1/README.md)
[![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-111?style=flat-square)](LICENSE)
[![Profiles: CC BY 4.0](https://img.shields.io/badge/profiles-CC%20BY%204.0-111?style=flat-square)](PROFILE-LICENSE.md)

[How it works](#how-it-works) · [Example](#an-example-side-by-side) · [Why it wins](#why-it-beats-write-like) · [The catalogue](#the-catalogue) · [Use it everywhere](#use-it-everywhere) · [Add a voice](#add-a-voice) · [Claim your voice](#claim-your-voice)

</div>

<br>

## How it works

1. **Pick a voice.** Every voice in the catalogue is a researched study of how a famous person writes: how they open, argue, land a line, and what they never say.
2. **Bring your point.** Your brief, your facts, your numbers, your story. The voice changes the delivery and leaves the substance alone.
3. **Switch any time.** Same idea, another voice, one swap. Mid-draft or mid-thread.

## An example, side by side

<!-- demo:start donald-trump elon-musk cher theo-von mrbeast william-shakespeare snoop-dogg ricky-gervais -->
> **The brief:** After eight months of building, we launch our app on Friday. It turns voice notes into a to-do list. Free for the first month.

<table>
<tr>
<th width="25%"><a href="profiles/donald-trump/VOICE.md">Donald Trump</a></th>
<th width="25%"><a href="profiles/elon-musk/VOICE.md">Elon Musk</a></th>
<th width="25%"><a href="profiles/cher/VOICE.md">Cher</a></th>
<th width="25%"><a href="profiles/theo-von/VOICE.md">Theo Von</a></th>
</tr>
<tr>
<td valign="top">
<p>After eight long months of building, our App launches this Friday! You talk, and it turns your Voice Notes into a To-Do List, very fast and very easy. FREE for the first month. You will love it. A BIG day!!!</p>
</td>
<td valign="top">
<p>8 months of work. Launches Friday.</p>
<p>Talk to it and it writes your to-do list.</p>
<p>First month free</p>
</td>
<td valign="top">
<p>8 MONTHS OF BUILDING…&amp; FRIDAY IT'S HERE‼️🚀<br>Our App Turns UR Voice Notes In2 A To-Do List📝✨<br>U TALK,IT LISTENS🙏🏻(Unlike Some Ppl I Know🙄)<br>FIRST MONTH FREE💋</p>
</td>
<td valign="top">
<p>we been building this app for 8 months bro. drops friday. u just talk into it and it turns ur voice notes into a to-do list. its like having a little assistant in ur phone except this one dont do cocaine. first month free</p>
</td>
</tr>
<tr>
<th width="25%"><a href="profiles/mrbeast/VOICE.md">MrBeast</a></th>
<th width="25%"><a href="profiles/william-shakespeare/VOICE.md">William Shakespeare</a></th>
<th width="25%"><a href="profiles/snoop-dogg/VOICE.md">Snoop Dogg</a></th>
<th width="25%"><a href="profiles/ricky-gervais/VOICE.md">Ricky Gervais</a></th>
</tr>
<tr>
<td valign="top">
<p>We spent 8 MONTHS building an app and it launches this Friday!! You literally just talk and it turns your voice notes into a to-do list :D First month is free, go try it and tell me what you think!!</p>
</td>
<td valign="top">
<p>Eight months we laboured; Friday is the day<br>We send our app abroad into the world.<br>Speak but thy notes, and it shall straight array<br>Thy tasks in order, every list unfurled.<br>The first month is our gift; no coin we ask,<br>So speak, and let thy voice set down each task.</p>
</td>
<td valign="top">
<p>8 months in the making 🔨🔥 Our app droppin Friday!! U talk, it turns your voice notes into a to-do list 📝👍🏿 First month free. BlessUp 🙏🏿</p>
</td>
<td valign="top">
<p>We've spent 8 months building an app. It launches on Friday. You talk into it &amp; it turns your voice notes into a to-do list. So now you can ignore your responsibilities in a much more organised way. First month is free. You're welcome 😂</p>
</td>
</tr>
</table>
<!-- demo:end -->

<sub>Handwritten editorial illustrations of each profile's technique, never quotations or model output. Every voice's own example is in its <code>profile.json</code>.</sub>

## Why it beats "write like…"

Ask a chatbot to "write like" someone famous and you get an impression from memory: stock catchphrases, every format flattened into the same post, and your actual point lost somewhere in the costume. Silvertongue voices are built the other way round.

- **Studied from the source.** Each voice is drawn from what the person actually published, in the medium it is for, with every source linked.
- **Blind-tested before it ships.** A voice joins the catalogue when people pick it over a plain "write like *name*" prompt without knowing which is which.
- **Your facts, their delivery.** Numbers, names and stories come through untouched. That is why people post the result.
- **One file, every surface.** The same `VOICE.md` runs in your agent, your browser and anywhere else a model reads text.

## The catalogue

Founders and builders, creators, stars, comedians, essayists, classic writers and politicians, admitted one pull request at a time. Each voice is a folder in [`profiles/`](profiles): a `VOICE.md` that an agent reads, and a `profile.json` with its scope, limits and sources.

<!-- catalogue:start -->
| Voice | The move | Studied | Status |
| --- | --- | --- | --- |
| [**Cher**](profiles/cher/VOICE.md) | Feel it, post it, and let the emoji finish the sentence. | 9 posts, 2016 to 2024 | Draft |
| [**Donald Trump**](profiles/donald-trump/VOICE.md) | Make it the biggest thing that ever happened, with Capitals and exclamation marks. | 1 speech and 7 posts, 2017 to 2026 | Draft |
| [**Elon Musk**](profiles/elon-musk/VOICE.md) | Say it in as few words as the claim allows and let a number do the arguing. | 2 essays and 8 posts, 2006 to 2026 | Draft |
| [**MrBeast**](profiles/mrbeast/VOICE.md) | Lead with a premise and a big number, then tell people to go watch. | 10 posts, 2022 to 2026 | Draft |
| [**Ricky Gervais**](profiles/ricky-gervais/VOICE.md) | Say the plain thing, then turn it in the last sentence. | 1 transcript and 7 posts, 2020 to 2026 | Draft |
| [**Snoop Dogg**](profiles/snoop-dogg/VOICE.md) | Name it, say it's out now, tag your people and let the emoji talk. | 1 speech and 7 posts, 2018 to 2025 | Draft |
| [**Theo Von**](profiles/theo-von/VOICE.md) | Say what a thing really is in one absurd comparison, then take it somewhere darker. | 22 posts, 2015 to 2026 | Draft |
| [**William Shakespeare**](profiles/william-shakespeare/VOICE.md) | Raise the stakes, turn the listener's view around, and land it in a rhymed couplet. | 4 plays and 1 poem, 1604 to 1623 | Draft |

Featured voices. All 27 are listed in [`profiles/`](profiles/README.md).
<!-- catalogue:end -->

<sub>Generated from <code>profiles/</code> with <code>npm run catalogue</code> and checked in CI.</sub>

<details>
<summary><b>What's inside a voice</b></summary>
<br>

`VOICE.md` has seven parts, defined by the [VOICE.md v1 format](spec/voice/v1/README.md):

| Part | What it captures |
| --- | --- |
| Stance | How the writer meets the reader and the subject |
| Construction | How a piece opens, turns and lands |
| Rhythm | Sentence and paragraph movement |
| Detail | Which specifics earn their place |
| Formats | How the voice bends for posts, replies, explanations and threads |
| Restraint | What the voice leaves out |
| Facts and identity | Your facts stay yours; nobody pretends to be anybody |

</details>

## Use it everywhere

| Where | How | |
| --- | --- | --- |
| **Any agent** | Hand it a `VOICE.md` with your brief | Now |
| **Claude Code and Codex** | `claude plugin marketplace add auscaster/agent-plugins`, then `claude plugin install silvertongue@auscaster` (or `codex plugin add silvertongue@auscaster`) | Now |
| **Any MCP client** | `https://mcp.silvertongue.dev/mcp`, with voice switching mid-thread | Now |
| **Your browser** | An extension for Chrome, Edge, Firefox and Safari that writes in any compose box | Next |

Start now with any voice:

```bash
curl -fsSLo VOICE.md https://raw.githubusercontent.com/auscaster/silvertongue/main/profiles/elon-musk/VOICE.md
```

```text
Rewrite draft.md using VOICE.md. Keep every fact, number and name from my notes.
```

## Add a voice

Know someone's writing cold? Put them in the catalogue.

```bash
git clone https://github.com/auscaster/silvertongue && cd silvertongue
npm ci && npm run verify
```

Add `profiles/<slug>/VOICE.md` and `profile.json`, run `npm run catalogue && npm run verify`, and open a pull request. [CONTRIBUTING.md](CONTRIBUTING.md) has the rules: study the medium the voice is for, link every source, describe technique only.

## Claim your voice

In the catalogue yourself? Open an issue to claim your voice, correct it or have it removed. Creator-verified official voices are on the way.

## House rules

- **Style, never identity.** No invented quotes, opinions or endorsements, and no claiming to be the person. Every voice is an unofficial study until its owner claims it.
- **Politics is delivery only.** Politician voices never state positions, endorse anyone or write about elections and voting.
- **Sources linked, never copied.** Profiles point at the originals.
- **Drafts, never autoposts.** You decide what gets sent.

## License

Code is [Apache-2.0](LICENSE). Profiles are [CC BY 4.0](PROFILE-LICENSE.md). The Silvertongue name and logo are not licensed; see [NOTICE](NOTICE). Security issues go to [SECURITY.md](SECURITY.md).

<br>

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/silvertongue-symbol-light.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/silvertongue-symbol-dark.svg">
  <img alt="" src="assets/silvertongue-symbol-dark.png" width="40">
</picture>
<br>
<sub>Made by <a href="https://auscaster.com">auscaster</a></sub>
</div>
