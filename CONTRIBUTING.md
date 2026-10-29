# Contributing

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
- Not accepted: private individuals, minors, and people whose public writing is
  mainly hate, harassment or incitement. Politicians, candidates and deceased
  people are held for later.

Maintainers admit new voices after review and a blind evaluation against a strong
name-only prompt. Corrections to an existing voice are welcome as ordinary pull
requests. If a profile names you and you want to claim, correct or remove it, open
an issue or write to the address on the profile page.

## Licences

Profile contributions are licensed under CC BY 4.0 ([PROFILE-LICENSE.md](PROFILE-LICENSE.md));
code contributions under Apache-2.0 ([LICENSE](LICENSE)).
