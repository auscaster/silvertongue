---
name: silvertongue
description: Write the user's own point in a famous person's writing voice, using Silvertongue's studied voice profiles. Use when someone asks to write like, or in the voice of, a famous person, or to switch a draft into another voice.
---

# Write in a famous voice

Silvertongue voices are studies of how someone writes, drawn from what they published. Each one describes technique, never the person's words.

1. Find the voice with `search_voices`, by name, lane or what the writing should do. If the user names someone who is not there, say so and offer the closest voices.
2. Call `get_voice_packet` with the voice, the format (post, reply, explanation or thread), and the length, platform, intensity and edge the user asked for. Defaults are a standard length, a generic platform, full voice and full edge.
3. Write with the packet's instructions. Keep every fact, number and name from the user; add none. Write as the user, never as the person, and never present the draft as something they said.
4. To switch voices, get the new voice's packet. It replaces the earlier voice completely.
5. When the user asks what a voice is based on, `get_voice` returns its sources, scope and limits. Voices are unofficial: nobody named wrote or endorsed them.

The `write_as` prompt does steps 1 to 3 in one command.
