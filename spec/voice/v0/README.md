# Voice profile format, v0

The experimental format for researched writing profiles. v0 defines the current
contract; it may evolve as contributors add and improve voices.

A voice profile is a directory `profiles/<slug>/` holding two files. `profile.ts`
in this directory is the validator; `npm run verify` runs it over every profile.
[GUIDE.md](GUIDE.md) is how to write a voice that is good, and the bar in `bar.ts` that
every voice is admitted against.

A profile describes what a writer is recognised by: what they notice, the moves
they make and when, and what their ordinary writing looks like. Its example pool
shows that range. Each voice also has its own iconic `example`; featured voices
share a `comparison` message for the side-by-side catalogue.

## VOICE.md

Independently usable instructions for writing in the voice: UTF-8 with LF
newlines, at least 1,000 characters and at most 40,000 bytes. It must contain
these second-level sections, exactly as written:

| Section | Covers |
| --- | --- |
| `## Lens` | What they care about, what they find absurd, how they see things: what a draft finds to say |
| `## Moves` | Each signature move as a mechanism: how it works, what material sets it off, roughly how often they use it, and one real line of theirs that shows it |
| `## Texture` | How they speak: grammar, sentence shapes, rhythm, register, the words they reach for, punctuation and emoji, as tendencies with when each shows up |
| `## Plain` | The register their writing rests on between the moves: how their ordinary sentences sound, never a reason for a draft without an angle |
| `## Occasions` | How they handle a post, a reply, a request, a complaint and good news |
| `## Never` | What they never do: harms, their world, and the caricature |
| `## Signatures` | Their catchphrases, each with the situation it belongs to |
| `## Facts and identity` | Keeping the user's facts; never claiming to be the person |
| `## Examples` | The pool, below |

Other sections, such as `## Sources`, may follow. A profile describes technique. It
never supplies the person's opinions, biography or endorsement, and quotes them only in
its signatures and its moves.

A profile is studied from their whole output, where people know them: the shows,
speeches, interviews, books and posts, never a handful of posts. Everything they are
recognised by belongs in it: what they notice, their moves, their grammar and way of
speaking, and their lines.

### Moves

Each move may show itself in one real line of theirs, in double quotes: a line, never a
passage, at most 160 characters, and one an observation in `profile.json` records with the
source it was heard or read in.

```markdown
- **The food insult:** the failure turned into one vivid kitchen image. Anything done badly; often. In his words: "The line, exactly as he said it."
```

A real line shows the move's shape: a draft makes a new one from the user's material, and
quotes the line as it stands only where the material is its own subject.

### Signatures

At least six catchphrases, the lines they use as they stand on all kinds of material, one
per line, each in bold and then the situation it belongs to:

```markdown
- **It's raw.** Anything undercooked, half-done or rushed.
```

Where a draft's material is one of these situations, its line lands, once, as the payoff
the draft builds to; where it is none of them, the draft reacts as they would and lands
none. A person's first draft from a voice is their most iconic take on it; later drafts are
new to them, with a line they have not already been given. A draft quotes at most one line
of the person's.

### Examples

At least twelve, each an ordinary everyday point and how the voice would handle it,
written in the technique:

```markdown
- **Point:** Reminder to clean out the office fridge by Friday.
  **Draft:** The draft, on one line or on several, each indented two spaces.
```

Each is memorable, unmistakably theirs, and uses a different move. A few land a signature,
where the point is its situation; most are carried by the lens, the moves and the way they
speak, so the pool teaches the voice and not a catchphrase on the end. No two drafts share their
first two words, their last word, or the run of marks or emoji they close on (a
plain full stop, question mark or exclamation mark is not counted). At most a quarter of the
drafts land a signature, and none lands two (a line inside a longer one lands with it). No
draft uses a real line from Moves that is not also a signature, no run of three words appears
in more than two drafts, and no draft has a doubled space. A point is at most 300 characters
and a draft at most 700. A writer shows a few drawn at random for each draft, so the pool is
what keeps one voice from writing the same post twice.

## profile.json

| Field | Rule |
| --- | --- |
| `slug` | Lowercase letters, digits and hyphens; matches the directory name |
| `name` | The person whose public writing was studied, the fictional character whose words were, or the style: a way of writing many people share, named as it reads after "in" (Gen Z, Victorian English, Pirate Speak) |
| `language` | Optional. The language the voice was studied in, by its two or three letter tag (`fr`, `pt`); English when left out. A source in another language says so with its own `language` |
| `lane` | `tech`, `celebrity`, `comedy`, `characters`, `classics`, `politicians` or `styles`: the lane agents and pages find the voice under. A style is in `styles`, and only a style is |
| `aliases` | Optional. One to eight other names people look for the voice by, in lower case, each given once and never the voice's own name: a style's other names (`slang` for Gen Z), or what a voice is searched as (`old english` for Shakespeare). Agents, pages and the apps find the voice by them |
| `verified` | Required boolean. `true` after maintainers approve the voice against the blind-test quality bar; only verified voices enter the app, MCP and extension catalogue. Community profiles may merge with `false` and remain available here for review and improvement |
| `featured` | Optional. A verified voice's place, from 1, among the featured voices that open the README and the site; no two profiles share one. Featuring a profile does not verify it |
| `description` | 20 to 220 characters |
| `scope` | Which medium and period the profile studies |
| `status` | `unofficial` |
| `lookalikes` | Four to eight other people a reader could most easily mistake the voice for, each named once: the people the bar's judge tells it apart from |
| `strengths`, `limitations` | At least two each |
| `sources` | At least three, each with `id`, `title`, an `https` `url`, `published`, `medium` (`essay`, `transcript`, `speech`, `letter`, `post`, `fiction`, `play`, `poem` or `reference`: a dictionary, usage guide or style guide) and a `note` of at least 20 characters. Link to sources; never copy them |
| `observations` | At least three, each a `trait` citing one or more source `id`s |
| `example` | The voice at its most iconic: a `message` of at least two sentences from the voice's own world, with the specifics it can play with, its `format`, and the `text` the voice makes of it, as long as the voice needs. Never a quotation, never presented as their words, and no two voices share a message |
| `comparison` | On a featured voice only: the same shape, on the one `message` every featured voice shares, for the side-by-side on the site and in the README |

Unknown fields are rejected. Breaking changes get a new format version.
