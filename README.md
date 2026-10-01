<div align="center">

# Suno MCP Server

**An MCP music workbench for turning vague creative ideas into structured, generation-ready music briefs.**

Design Music DNA, write stronger Suno Style fields, explore prompt patterns, and keep your creative workflow inside Claude Code, Cursor, Hermes, or any MCP client.

[![MCP](https://img.shields.io/badge/MCP-server-blue?style=for-the-badge)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Suno](https://img.shields.io/badge/Suno-compatible-purple?style=for-the-badge)](https://suno.com)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## What this is

Suno MCP Server is a **prompt strategy and music ideation layer** for AI-assisted music creation.

It helps an agent move from:

> “I want a nostalgic night-drive song that feels cinematic but still moves.”

to:

1. structured **Music DNA**
2. clearer creative constraints
3. a focused **Suno Style** field
4. optional lyrics and arrangement direction from the surrounding agent workflow
5. reusable prompt patterns for iteration

The current release is intentionally **text-first and provider-independent**. It prepares high-quality inputs for Suno; it does not claim to be an official Suno API or directly generate audio in Suno.

## Why it exists

AI music tools are easy to use but difficult to direct consistently. A short prompt often leaves important decisions implicit:

- What is the emotional center?
- What genre or hybrid is intended?
- Which instruments and textures should lead?
- How should energy develop from intro to outro?
- What vocal persona fits the idea?
- What styles should be avoided?

This server gives an MCP client a shared vocabulary and repeatable workflow for answering those questions before generation.

## Current status

| Capability | Status |
|---|---|
| Intent → structured Music DNA | Available |
| Music DNA → Suno-compatible Style field | Available |
| Keyword and vibe suggestions | Available |
| Intent clarity analysis | Available |
| Prompt and pattern matching | Available |
| Seed prompt resources | Available |
| Lyrics workflow | Planned |
| Song/project memory | Planned |
| Generation provider adapters | Planned |
| Direct Suno audio generation | Not currently included |

> **Important:** This is a community project and is not affiliated with, endorsed by, or sponsored by Suno. Suno generation remains a future integration area and should only use a supported provider interface or an explicitly user-controlled workflow.

## The golden path

```text
creative intent
  → analyze_intent
  → map_music_dna
  → refine the creative direction
  → build_style_field
  → compare against library://prompts
  → paste or route the generation brief to a supported music provider
  → iterate using feedback
```

## Install

Requirements:

- Node.js 18+
- pnpm
- an MCP-compatible client

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

The server uses stdio transport. Add it to an MCP client using the built entry point:

```json
{
  "music-mcp": {
    "command": "node",
    "args": ["/absolute/path/to/suno-mcp-server/dist/index.js"]
  }
}
```

Phase 1 runs offline and requires no Suno credentials.

## MCP tools

| Tool | Purpose |
|---|---|
| `map_music_dna` | Convert free-text intent into structured emotion, genre, mood, textures, energy arc, vocal persona, production, and exclusions. |
| `build_style_field` | Compose a concise, generation-ready Suno Style field from Music DNA and optional dynamics instructions. |
| `suggest_keywords` | Suggest high-signal vocabulary for a vibe, genre, and mood. |
| `analyze_intent` | Score how complete an idea is across the Music DNA dimensions and identify what is missing. |
| `match_top_patterns` | Find related producer patterns and seed-library examples. |

### Example workflow

First, map a creative idea:

```json
{
  "text": "Neon night drive, nostalgic but driving, 80s retro-futuristic synthwave, male baritone with a slight rasp, sparse pulsing bass intro that grows into a wide cinematic chorus",
  "bpm_hint": 128
}
```

Then pass the returned DNA into `build_style_field`:

```json
{
  "dna": { "...": "result from map_music_dna" },
  "max_chars": 450,
  "include_bpm_key": true
}
```

The style composer follows this structure:

```text
Genre + Mood + Era + Instruments + Vocal Persona + Production + Dynamics Journey
```

## Resources

The server exposes reusable local resources for an agent to inspect:

| URI | Description |
|---|---|
| `library://prompts` | Seed prompt library index. |
| `library://prompts/{id}` | Individual prompt-library entry. |
| `musicdna://vocab` | Music DNA keyword taxonomy. |
| `musicdna://vibe-maps` | Vibe-to-DNA mappings. |
| `musicdna://top-patterns` | Producer and prompt pattern cards. |

## MCP prompts

| Prompt | Purpose |
|---|---|
| `intent_to_dna` | Guide an agent through clarifying a vague musical idea. |
| `emotion_image_to_style` | Turn an image or visual description into Music DNA and a Style field. |

## Architecture direction

The intended long-term architecture is a **music workbench**, not a thin wrapper around one provider:

```text
Song concept
  → Music DNA
  → lyrics and arrangement
  → provider-ready generation package
  → generation result
  → critique and revision
  → version history
```

Future provider adapters can implement a stable interface for generation, status, and result import without changing the MCP tools used by the client. Until a supported Suno integration is available, the practical workflow is to use this server to create a polished generation package and then generate through the user’s chosen interface.

## Development

```bash
pnpm run typecheck
pnpm run test:phase1
pnpm run build
```

Current constraints:

- text-first
- stdio transport only
- no HTTP gateway
- no bulk media downloads
- no credentials required for the current phase
- image URLs are accepted as text hints only; they are not fetched

## Project layout

```text
src/
  index.ts                 # stdio entry point
  server.ts                # MCP server, tools, resources, and prompts
  schemas/                 # Zod validation schemas
  engine/                  # DNA mapping, style composition, matching, and library logic
  tools/                   # validated MCP tool handlers
  data/                    # seed vocabulary, vibe maps, and prompt patterns

docs/
  PHASE1.md               # Phase 1 contracts and implementation notes

tests/
  phase1.test.ts          # Phase 1 tests
```

## Roadmap

- **Phase 1 — Prompt Strategy:** Music DNA, Style fields, vocabularies, and prompt resources. **Current.**
- **Phase 2 — Lyrics:** Structured songwriting and section-aware lyric development.
- **Phase 3 — Composition:** Arrangement, dynamics, transitions, and sonic identity.
- **Phase 4 — Song Projects:** Persistent concepts, variants, feedback, and version history.
- **Phase 5 — Generation Providers:** Provider-neutral adapters and importable generation results.
- **Phase 6 — Assets and Analytics:** Covers, videos, catalogs, and creative analytics.

## Ecosystem

- Music architecture: `music-ecosystem/docs/MUSIC_ECOSYSTEM_ARCHITECTURE.md`
- Phase specifications: `music-ecosystem/mcp-specs/MCP_PHASES.md`
- Seed library: `music-ecosystem/prompt-library/SEED_PROMPT_LIBRARY.md`
- Related skills: `suno-e2e-workflow`, `songwriting-and-ai-music`

## License

MIT

## Provider-neutral session preparation (0.3)

`prepare_music_session` validates an approved style/lyric session and compiles Suno supervised, Lyria clip/full, Eleven Music or fal MiniMax Music 3 packets. It preserves lyrics, enforces provider duration/instrumental constraints, bounds candidate count and estimates the render cost. It makes no network request and cannot authorize credits, submit jobs, download audio, listen or publish. Its owner field is a planning label; an executor must authenticate the owner and reserve a host-approved budget.

Craft fundamentals and provider guidance are maintained in the public `frankxai/agentic-music-producer-os` docs. The packet compiler is canonical here in `src/engine/session-compiler.cjs`; an operated factory can vendor this pure compiler with a source revision/hash and parity tests. It contains no private canon or credentials.
