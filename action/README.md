# Silvertongue Celebrity PR Review

**Let Gordon Ramsay or Marcus Aurelius school your sloppy PRs, or Tony Hinchcliffe or Ricky Gervais roast them.** Or hand them to Sherlock Holmes, Shakespeare, Brainrot, or any of 65+ famous voices and styles.

It's a GitHub Action for AI code review. The review is hard, the delivery is funny, and every finding is pinned to a file and a line with the evidence underneath. It runs on your Claude Pro or Max plan, so there's no API bill.

```yaml
- uses: auscaster/silvertongue@v1
  with:
    voice: gordon-ramsay
    claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

[Set it up](#set-it-up) · [Pick your reviewer](#pick-your-reviewer) · [How funny](#how-funny) · [Inputs](#inputs) · [Where your code goes](#where-your-code-goes)

## What lands on your pull request

A real review of a real pull request: 372 lines of Go, written by an AI agent. Gordon Ramsay found a test helper copied from the file next door:

> Hang on. Another runner? You had runCopilotFake sitting right there, and you've copied it line for line just so it takes a Config? That's baking a whole second cake because you wanted a different candle. Give the original a Config parameter, bin runCopilotFakeWithConfig, and share one argv reader across both test files.

Under every comment sits the plain version, folded away until someone needs it:

<details><summary><b>Minor</b>: the fix and the evidence</summary>

**Fix.** Give `runCopilotFake` a `Config` parameter, or make it a thin wrapper over a shared helper that takes a `Config`. Delete `runCopilotFakeWithConfig`. Use the same argv reader in both test files.

**Evidence.** Read server/pkg/agent/copilot_stdin_unix_test.go:22-50. `runCopilotFake` has the same body line for line: writeTestExecutable, New("copilot", …), Execute, drain Messages, then a select with a 30s timeout. The only difference is that it hardcodes `Config{ExecutablePath: fakePath, Logger: slog.Default()}`.

</details>

More lines from reviews of the same pull request, in other voices:

> I went looking for something to be furious about and found manners. Disgusting.
>
> **Ricky Gervais**, approving a clean pull request

> That's not cleanup, that's a mob hit where the second guy shoots a body already in the trunk.
>
> **Tony Hinchcliffe**, on a temp folder deleted twice

> It closes it the way a cat flap closes a door.
>
> **Ricky Gervais**, on a description that says it closes an issue it half fixes

> The day someone changes how modelMetrics map onto TokenUsage, they'll season one pot, forget the other, and we'll be ladling two different soups out of one recipe.
>
> **Gordon Ramsay**, on the same loop written in two places

> That comment is a waiter still reading out the specials after the kitchen burned down, a guy still wearing the ring after the divorce cleared, a tombstone for a patient who walked out of the hospital this afternoon.
>
> **Tony Hinchcliffe**, on a comment the pull request made untrue

> That's not a new helper, mate. That's the old one in a hat.
>
> **Ricky Gervais**, on a test helper copied to take one more parameter

## Why it reviews like this

AI agents write pull requests faster than anyone can read them, and the bad ones look finished: a tidy description, green checks, a test file. Then you find the helper that already existed two folders over, the issue it says it closes and doesn't, and the test that still passes with the feature deleted. Whoever merges it pays for it for years.

So the review starts where a hard reviewer starts: should this change exist at all? It checks every claim in the description against the code. It searches for the capability before it accepts a new helper, counts the callers of every new option, and asks what the smallest change would have been. Then it looks at shape, duplication, boundaries, tests that can't fail, and clutter. It reads and searches your code to back each finding, and a finding it can't pin to a file and a line never gets reported. Your AGENTS.md, CLAUDE.md and CONTRIBUTING.md outrank its taste, and a finding that breaks one of them quotes the rule.

Then it says all of that in a voice people actually read. A review nobody reads fixes nothing.

## Set it up

On a Claude Pro or Max plan, connect your subscription:

```sh
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN
```

The first command prints a token once you've signed in, and the second saves it to your repository as a secret. Then add `.github/workflows/silvertongue.yml`:

```yaml
name: silvertongue
on:
  pull_request:
    types: [opened, ready_for_review]
permissions:
  contents: read
  pull-requests: write
jobs:
  review:
    if: ${{ !github.event.pull_request.draft }}
    runs-on: ubuntu-latest
    steps:
      - uses: auscaster/silvertongue@v1
        with:
          voice: gordon-ramsay
          claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

Open a pull request. A couple of minutes later the review arrives as an ordinary GitHub review, with the verdict and the opening at the top and each finding on its line. A pull request that should be rejected or reshaped comes back as "changes requested".

No subscription? An API key works the same way: pass `anthropic-api-key`, `openai-api-key` or `gemini-api-key` instead, saved with `gh secret set`.

## Pick your reviewer

Set `voice` to any of these. Each kind of voice is funny in its own way.

**Comedians** tell their own jokes about your code: `ricky-gervais`, `bill-burr`, `jimmy-carr`, `jerry-seinfeld`, `theo-von`, `tony-hinchcliffe`, `joe-rogan`.

**Stars and characters** are funny by being themselves at your code: `gordon-ramsay`, `snoop-dogg`, `arnold-schwarzenegger`, `dwayne-johnson`, `werner-herzog`, `ryan-reynolds`, `cher`, `kim-kardashian`, `bob-dylan`, `mrbeast`, `sherlock-holmes`, `dwight-schrute`, `gandalf-the-grey`, `rick-sanchez`, `spock`, `the-terminator`, `eric-cartman`, `james-bond`, `ted-lasso`, `spongebob-squarepants`.

**Philosophers, writers, founders and politicians** take your missing null check with complete seriousness, which is the joke: `marcus-aurelius`, `sun-tzu`, `william-shakespeare`, `oscar-wilde`, `mark-twain`, `jane-austen`, `edgar-allan-poe`, `paul-graham`, `warren-buffett`, `naval-ravikant`, `jeff-bezos`, `andrej-karpathy`, `pieter-levels`, `sam-altman`, `elon-musk`, `bill-gates`, `marc-andreessen`, `alex-hormozi`, `derek-sivers`, `abraham-lincoln`, `barack-obama`, `alexandria-ocasio-cortez`, `donald-trump`.

**Styles** turn the whole review into a register: `brainrot`, `gen-z`, `rizz`, `pirate-speak`, `therapy-speak`, `corporate-jargon`, `linkedin-speak`, `linkedin-post`, `reddit`, `boomer-texting`, `medieval-english`, `victorian-english`, `posh-english`, `fancy-english`, `plain-english`.

None of them is an impression. Each voice is a study of how that person or style really writes, built from their own work with every source linked, and you can read any of them at [silvertongue.dev/voices](https://silvertongue.dev/voices).

## How funny

Every voice does what you picked it for. Pick Tony Hinchcliffe or Ricky Gervais and you get roasted: a laugh on every line, and the fix still lands in each one. When the code is actually good, they admit it, reluctantly, and find one small thing to needle. Gordon Ramsay is himself, which is to say furious at a raw helper and generous to a clean one. Marcus Aurelius takes your missing null check with complete seriousness. Nobody invents a fault to have something to joke about, and the joke is on the code, never on the person who wrote it.

`humour` overrides the voice:

- `roast` goes for the laugh on every line, in any voice.
- `light` is comic relief: one real laugh in the opening, and a few in the comments where the code hands the voice a joke.
- `off` keeps the voice and drops the jokes.

`edge: clean` also takes out swearing and dark humour, for the repository your manager reads.

## Inputs

| Input | Default | |
| --- | --- | --- |
| `voice` | `marcus-aurelius` | Any voice above, or any slug at [silvertongue.dev/voices](https://silvertongue.dev/voices). |
| `claude-code-oauth-token` | | A Claude Pro or Max subscription, from `claude setup-token`. Wins when an API key is also given. |
| `anthropic-api-key`, `openai-api-key`, `gemini-api-key` | | Or one API key. |
| `model` | your plan's model; `claude-opus-5-5`, `gpt-6.1-sol` or `gemini-4-argon` for a key | Any model id from that provider. |
| `humour` | the voice's own | `roast`, `light` or `off`. Comedians roast unless you say otherwise. See [How funny](#how-funny). |
| `edge` | `full` | `clean` takes out the voice's swearing and dark humour. |
| `request-changes` | `true` | A reject or reshape verdict is submitted as "changes requested". `false` always comments. |
| `post` | `true` | `false` writes the review to the job summary and posts nothing. |
| `pull-request` | | A pull request number, for runs that are not started by a pull request. |

Outputs: `verdict` (`reject`, `reshape` or `accept`) and `review-url`.

## Where your code goes

The Action runs on GitHub's runner. It reads the pull request with the job's own token, fetches the repository at the pull request's head commit to read and search it, and never runs anything in it. On a Claude subscription the review runs through Claude Code in restricted mode, which can read and search that code and do nothing else. The code goes to the model provider you connected, and nowhere else. Silvertongue's server is asked for one thing: the writing instructions for the voice, by its name.

## What it costs

On a Claude plan, a review counts against the plan like any other Claude Code session, and there's no API bill. On an API key, a 400-line pull request reviewed with `claude-opus-5-5` uses about 320,000 input tokens, most of them cached, and 6,000 output tokens: well under a dollar.

## Pull requests from forks

GitHub gives a `pull_request` run from a fork no secrets and a read-only token. To review those too, run on `pull_request_target` instead. It runs the workflow from your base branch, and the Action only reads the pull request's code, so nothing from the fork runs with your key. This repository reviews its own pull requests that way: [.github/workflows/review.yml](../.github/workflows/review.yml).
