<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/silvertongue-wordmark-light.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/silvertongue-wordmark-dark.svg">
  <img alt="Silvertongue" src="assets/silvertongue-wordmark-dark.png" width="400">
</picture>

<h3>Write like anyone famous.</h3>

An open catalogue of famous writing voices for your agent, your browser and your pull requests.<br>
Pick a voice. Switch any time. Keep your point.

[![CI](https://img.shields.io/github/actions/workflow/status/auscaster/silvertongue/ci.yml?branch=main&style=flat-square&label=ci&labelColor=111&color=111)](https://github.com/auscaster/silvertongue/actions/workflows/ci.yml)
[![Format: VOICE.md v0 (experimental)](https://img.shields.io/badge/format-VOICE.md%20v0%20%28experimental%29-111?style=flat-square)](spec/voice/v0/README.md)
[![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-111?style=flat-square)](LICENSE)
[![Profiles: CC BY 4.0](https://img.shields.io/badge/profiles-CC%20BY%204.0-111?style=flat-square)](PROFILE-LICENSE.md)

[Review pull requests](#review-pull-requests) · [How it works](#how-it-works) · [Example](#an-example-side-by-side) · [Why it wins](#why-it-beats-write-like) · [The catalogue](#the-catalogue) · [Use it everywhere](#use-it-everywhere) · [Add a voice](#add-a-voice) · [Remove or correct a voice](#remove-or-correct-a-voice)

</div>

<br>

## Review pull requests

**Get your pull requests reviewed by Gordon Ramsay.** Or Marcus Aurelius, Ricky Gervais, Brainrot, or any voice here. [Silvertongue Celebrity PR Review](action/README.md) is a GitHub Action for AI code review: it asks first whether the change should exist, checks every claim in the description against the code, and pins every finding to a file and a line. Then it says it in the voice you picked. It runs on your Claude subscription with no API bill, or on an Anthropic, OpenAI or Gemini key.

```yaml
- uses: auscaster/silvertongue@v1
  with:
    voice: gordon-ramsay
    claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

[Set it up](action/README.md#set-it-up) · [Pick your reviewer](action/README.md#pick-your-reviewer) · [See a real review](action/README.md#what-lands-on-your-pull-request)

## How it works

1. **Pick a voice.** Every voice in the catalogue is a researched study of how a famous person writes: how they open, argue, land a line, and what they never say.
2. **Bring your point.** Your brief, your facts, your numbers, your story. The voice changes the delivery and leaves the substance alone.
3. **Switch any time.** Same idea, another voice, one swap. Mid-draft or mid-thread.

## An example, side by side

<!-- demo:start william-shakespeare snoop-dogg cher theo-von mrbeast donald-trump elon-musk ricky-gervais -->
> **The message:** To my mate Dave: I can't make your wedding on Saturday. I double-booked, and honestly the open bar was the only reason I was coming. Congratulations though. I owe you a blender.

<table>
<tr>
<th width="25%"><a href="profiles/william-shakespeare/VOICE.md">William Shakespeare</a></th>
<th width="25%"><a href="profiles/snoop-dogg/VOICE.md">Snoop Dogg</a></th>
<th width="25%"><a href="profiles/cher/VOICE.md">Cher</a></th>
<th width="25%"><a href="profiles/theo-von/VOICE.md">Theo Von</a></th>
</tr>
<tr>
<td valign="top">
<p>Good Dave, I cannot stand beside thee Saturday; I have promised that same day elsewhere, a sin of mine own diary. And shall I lie? It was the open bar that drew me, not the vows: thy wine I loved, and thee a little less. Yet joy to thee, and hear this debt I send:<br>One blender do I owe thee, faithful friend;<br>May it outlast the marriage, to the end.</p>
</td>
<td valign="top">
<p>Dave nephew, I can't make it Saturday. Double booked myself n that's on me. Real talk tho, tha open bar was tha only reason I was pullin up. Big congrats 2 y'all 🎉👏🏿 I owe you a blender. Y'all gonna need it.</p>
</td>
<td valign="top">
<p>DAVE.Babe I Can't Make The Wedding Saturday.I Double Booked Myself😩 &amp; I'm Not Gonna Lie 2 U,The Open Bar Was The Only Reason I Was Coming.Congrats 2 U Both,I'm Crying Already😭 I Owe U A Blender💋🎉</p>
</td>
<td valign="top">
<p>cant make ur wedding saturday dave. i double booked bro. a wedding is really just a open bar with a sad speech in front of it, and honestly the bar was the only reason i was comin. we had a guy back home married his landlord and they never had a bad month. congrats brother. i owe u a blender</p>
</td>
</tr>
<tr>
<th width="25%"><a href="profiles/mrbeast/VOICE.md">MrBeast</a></th>
<th width="25%"><a href="profiles/donald-trump/VOICE.md">Donald Trump</a></th>
<th width="25%"><a href="profiles/elon-musk/VOICE.md">Elon Musk</a></th>
<th width="25%"><a href="profiles/ricky-gervais/VOICE.md">Ricky Gervais</a></th>
</tr>
<tr>
<td valign="top">
<p>Dave I can't make your wedding Saturday because I double booked, literally my fault. The open bar was the only reason I was coming lol. So here's the deal: I owe you a blender, and every year you two stay married the blender gets bigger. Year 50 it's the size of a car. Congrats bro 🥰</p>
</td>
<td valign="top">
<p>Dave, I can't make your Wedding on Saturday. Double-booked, very much in demand, nobody has ever been this booked, maybe ever. And frankly the Open Bar was the only reason I was coming. Tremendous bar, everybody says so. Congratulations anyway! You made a beautiful deal. I owe you a Blender. It will be the best Blender!</p>
</td>
<td valign="top">
<p>Can't make the wedding Saturday. Double-booked. Primary attraction was the open bar, so expected loss to you is roughly one drunk guest. Congrats. Blender inbound</p>
</td>
<td valign="top">
<p>Can't make your wedding Saturday, mate. Double-booked. I'd love to say I'm gutted, but to be fair the only reason I was coming was the open bar. Congratulations though. Genuinely. Half of these end in divorce &amp; the other half end in death, so enjoy it. I owe you a blender.</p>
</td>
</tr>
</table>
<!-- demo:end -->

<sub>Written in each profile's technique, never their words. Every voice's own example is in its <code>profile.json</code>.</sub>

## Why it beats "write like…"

Ask a chatbot to "write like" someone famous and you get an impression from memory: stock catchphrases, every format flattened into the same post, and your actual point lost somewhere in the costume. Silvertongue voices are built the other way round.

- **Studied from the source.** Each voice is drawn from their own words (what the person published, or what the character says on the page and on screen), in the medium it is for, with every source linked.
- **Blind-tested before it ships.** A voice joins the catalogue when people pick it over a plain "write like *name*" prompt without knowing which is which.
- **Your facts, their delivery.** Numbers, names and stories come through untouched. That is why people post the result.
- **One file, every surface.** The same `VOICE.md` runs in your agent, your browser and anywhere else a model reads text.

## The catalogue

Founders and builders, creators, stars, comedians, famous characters, essayists, classic writers and politicians, added one pull request at a time. Each voice is a folder in [`profiles/`](profiles): a `VOICE.md` that an agent reads, and a `profile.json` with its scope, limits, sources and verification status.

Community profiles can merge here before verification. Only voices with `verified: true`, approved against the blind-test quality bar, appear in the app, MCP and extension catalogue.

<!-- catalogue:start -->
| Voice | The move | Studied |
| --- | --- | --- |
| [**Cher**](profiles/cher/VOICE.md) | Feel it, post it, and let the emoji finish the sentence. | 12 posts and 2 transcripts, 1996 to 2026 |
| [**Donald Trump**](profiles/donald-trump/VOICE.md) | Make it the biggest thing that ever happened, with Capitals and exclamation marks. | 1 speech, 8 posts and 1 essay, 1987 to 2026 |
| [**Elon Musk**](profiles/elon-musk/VOICE.md) | Say it in as few words as the claim allows and let a number do the arguing. | 2 essays, 8 posts and 2 transcripts, 2006 to 2026 |
| [**MrBeast**](profiles/mrbeast/VOICE.md) | Lead with a premise and a big number, then tell people to go watch. | 10 posts and 4 transcripts, 2021 to 2026 |
| [**Ricky Gervais**](profiles/ricky-gervais/VOICE.md) | Say the plain thing, then turn it in the last sentence. | 5 transcripts and 7 posts, 2016 to 2026 |
| [**Snoop Dogg**](profiles/snoop-dogg/VOICE.md) | Call what's really going on like it's a game on TV, then rule on it. | 1 speech, 7 posts and 10 transcripts, 2016 to 2025 |
| [**Theo Von**](profiles/theo-von/VOICE.md) | Say what a thing really is in one absurd comparison, then take it somewhere darker. | 24 posts and 1 transcript, 2015 to 2026 |
| [**William Shakespeare**](profiles/william-shakespeare/VOICE.md) | Raise the stakes, turn the listener's view around, and land it in a rhymed couplet. | 5 plays and 1 poem, 1604 to 1623 |

Featured voices. All 50 public profiles are listed in [`profiles/`](profiles/README.md).
<!-- catalogue:end -->

<sub>Generated from <code>profiles/</code> with <code>npm run catalogue</code> and checked in CI.</sub>

<details>
<summary><b>What's inside a voice</b></summary>
<br>

`VOICE.md` has nine parts, defined by the [VOICE.md v0 format](spec/voice/v0/README.md):

| Part | What it captures |
| --- | --- |
| Lens | What they notice and make of things: what a draft finds to say |
| Moves | Their signature moves, each with what sets it off, how often, and a real line of theirs that shows it |
| Texture | How they speak: grammar, rhythm, register, the words they reach for, punctuation and emoji |
| Plain | What most of their writing looks like |
| Occasions | How they handle a post, a reply, a request, a complaint and good news |
| Never | What they never do, and the impression people imitate |
| Signatures | Their catchphrases, each with the situation it belongs to |
| Facts and identity | Your facts stay yours; nobody pretends to be anybody |
| Examples | About twenty ordinary points and how they would handle each, for range |

</details>

## Use it everywhere

| Where | How | |
| --- | --- | --- |
| **Any agent** | Hand it a `VOICE.md` with your brief | Now |
| **Claude Code and Codex** | `claude plugin marketplace add auscaster/agent-plugins`, then `claude plugin install silvertongue@auscaster` (or `codex plugin add silvertongue@auscaster`) | Now |
| **Gemini CLI** | `gemini extensions install https://github.com/auscaster/silvertongue` | Now |
| **Any MCP client** | `https://mcp.silvertongue.dev/mcp`, with voice switching mid-thread | Now |
| **Your browser** | [Get the browser extensions](https://silvertongue.dev/#get) and rewrite in the text box where you work | Now |
| **Pull requests** | The GitHub Action, `uses: auscaster/silvertongue@v1`: [set it up](action/README.md) | Now |

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

Add `profiles/<slug>/VOICE.md` and `profile.json`, run `npm run catalogue && npm run verify`, and open a pull request. [Writing a voice](spec/voice/v0/GUIDE.md) is how to make one good and the bar it has to pass; [CONTRIBUTING.md](CONTRIBUTING.md) has the rest.

## Remove or correct a voice

If a profile studies you, or a character whose rights you hold, and you want it out, [ask privately](https://silvertongue.dev/terms#removing-a-profile-that-studies-you): it comes out of the catalogue and the service within seven days, and no reason is needed. To fix something in a profile, [open an issue](https://github.com/auscaster/silvertongue/issues/new?template=correct-a-voice.yml) or a pull request.

## House rules

- **Style, never identity.** No invented quotes, opinions or endorsements, and no claiming to be the person. Every voice is an unofficial study.
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
