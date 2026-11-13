# Silvertongue PR Review

AI PR review in a famous voice. A GitHub Action that reviews every pull request the way a hard reviewer would, then says it as Marcus Aurelius, Sherlock Holmes, Ricky Gervais or any of 50 famous voices.

The audit asks whether the change should exist at all before it looks at anything else: does it fix what it claims to, does the codebase already do this, is it the smallest change that would. Then shape, duplication, boundaries, tests that cannot fail, and clutter. It reads and searches the code to back every finding, and every finding names a file and a line. The review is posted on the pull request in the voice you pick: Marcus Aurelius, Sherlock Holmes, Gordon Ramsay or any of the voices in [`profiles/`](../profiles).

## Set it up

On a Claude Pro or Max plan, connect the subscription and there is no API bill: reviews count against the plan.

```sh
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN
```

Then add this workflow as `.github/workflows/silvertongue.yml`:

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
    runs-on: ubuntu-latest
    steps:
      - uses: auscaster/silvertongue@v1
        with:
          voice: marcus-aurelius
          claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

An API key works the same way: `anthropic-api-key`, `openai-api-key` or `gemini-api-key`, saved with `gh secret set` under the name you give it.

## Inputs

| Input | Default | |
| --- | --- | --- |
| `voice` | `marcus-aurelius` | Any folder name in [`profiles/`](../profiles). |
| `claude-code-oauth-token` | | A Claude subscription, from `claude setup-token`. Wins when an API key is also given. |
| `anthropic-api-key`, `openai-api-key`, `gemini-api-key` | | Or one API key. |
| `model` | your plan's model; `claude-opus-5-5`, `gpt-6.1-sol` or `gemini-4-argon` for a key | Any model id from that provider. |
| `humour` | `light` | `light` is comic relief: a laugh where the code earns one, never in place of the fix. `full` goes for the laugh on every line. `off` plays it straight. A comedian tells their jokes; Marcus Aurelius stays deadpan. |
| `edge` | `full` | `clean` takes out the voice's swearing and dark humour. |
| `request-changes` | `true` | A reject or reshape verdict is submitted as "changes requested". `false` always comments. |
| `post` | `true` | `false` writes the review to the job summary and posts nothing. |
| `pull-request` | | A pull request number, for runs that are not started by a pull request. |

Outputs: `verdict` (`reject`, `reshape` or `accept`) and `review-url`.

## Where your code goes

The Action runs on GitHub's runner. It reads the pull request with the job's own token, fetches the repository at the pull request's head commit to read and search it, and never runs anything in it. On a Claude subscription the review runs through Claude Code in restricted mode, which can read and search that code and do nothing else. The code goes to the model provider you connected, and nowhere else. Silvertongue's server is asked for one thing: the writing instructions for the voice, by its name.

A review of a 400-line pull request takes about two minutes. On an API key with `claude-opus-5-5` it uses about 320,000 input tokens, most of them cached, and 6,000 output tokens: well under a dollar.

## Pull requests from forks

GitHub gives a `pull_request` run from a fork no secrets and a read-only token. To review those too, run on `pull_request_target` instead. It runs the workflow from your base branch, and the Action only reads the pull request's code, so nothing from the fork runs with your key.
