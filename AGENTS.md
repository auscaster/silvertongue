# Agent instructions

This is the public Silvertongue repository: voice profiles, the profile format and
its validator, the agent skill, agent plugin manifests and the MCP Registry entry.
It holds only what people use straight from GitHub or install from it. Browser
extensions, mobile apps and web pages do not belong here. Keep it free of private
context: no personal paths, account or team IDs, internal plans, references to
private repositories, captured source text, evaluation outputs or compose prompts.

- Node 22.18 or later. Run `npm run verify` before finishing; it must pass.
- Profiles live in `profiles/<slug>/` and follow the experimental `spec/voice/v0/`. They study
  technique, link their sources and never copy them. Write and revise them by
  `spec/voice/v0/GUIDE.md`; the bar it states comes from `spec/voice/v0/bar.ts`.
- Specifications in `spec/` are contracts. Every rule gets a test; breaking changes
  get a new format version.
- Community profiles can merge with `verified: false`. Only maintainers approve
  `verified: true` after the blind-test quality bar; that is the gate for the app,
  MCP and extension catalogue. Verification never means endorsement by the subject.
- The skill and the MCP Registry entry point at the hosted service. They never carry prompts,
  model keys or a generator.
- Each agent platform's file sits at the root because that platform reads it there.
  CONTRIBUTING.md maps every one ("Where things live"); a new platform file gets its row
  in the same commit.
- Docs describe what exists today and mark anything planned as planned.
- Use conventional lowercase commit subjects without tool attribution.
