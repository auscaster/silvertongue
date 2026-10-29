# Voice profile format, v1

A voice profile is a directory `profiles/<slug>/` holding two files. `profile.ts`
in this directory is the validator; `npm run verify` runs it over every profile.

## VOICE.md

Independently usable instructions for writing in the voice: UTF-8 with LF
newlines, at least 1,000 characters and at most 40,000 bytes. It must contain
these second-level sections, exactly as written:

| Section | Covers |
| --- | --- |
| `## Stance` | How the writer approaches the reader and the subject |
| `## Construction` | How a piece opens, turns and ends |
| `## Rhythm` | Sentence and paragraph movement |
| `## Detail` | What earns a concrete detail and what does not |
| `## Formats` | How the voice adapts to posts, replies, explanations and threads |
| `## Restraint` | What the voice leaves out |
| `## Facts and identity` | Keeping the user's facts; never claiming to be the person |

Other sections, such as `## Sources`, may follow. A profile describes technique. It
never supplies the person's opinions, biography, quotations or endorsement.

## profile.json

| Field | Rule |
| --- | --- |
| `slug` | Lowercase letters, digits and hyphens; matches the directory name |
| `name` | The person whose public writing was studied |
| `lane` | `tech`, `celebrity`, `comedy`, `classics` or `politicians`: the lane agents and pages find the voice under |
| `featured` | Optional. The voice's place, from 1, among the featured voices that open the README and the site; no two profiles share one |
| `description` | 20 to 220 characters |
| `scope` | Which medium and period the profile studies |
| `status` | `unofficial` |
| `evaluation` | `unbenchmarked` until a blind evaluation is admitted |
| `strengths`, `limitations` | At least two each |
| `sources` | At least three, each with `id`, `title`, an `https` `url`, `published`, `medium` (`essay`, `transcript`, `speech`, `letter`, `post`, `fiction`, `play` or `poem`) and a `note` of at least 20 characters. Link to sources; never copy them |
| `observations` | At least three, each a `trait` citing one or more source `id`s |
| `illustration` | A `brief`, a `format`, the `text`, and `kind: "editorial-illustration"`: handwritten, never presented as model output or a quotation |

Unknown fields are rejected. Breaking changes get a new format version.
