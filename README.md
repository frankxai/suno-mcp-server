<div align="center">

# Songcraft & Suno MCP Server (`@frankxai/suno-mcp-server`)

**The Sovereign AI Music Prompt Workbench, Lyric Architecture & Music DNA Engine for MCP**

*Design structured Music DNA, craft rights-safe song lyrics, audit AI clichés with an objective Slop Index (0–100), structure song timelines, and compile high-density Suno v4/v5/v5.5 and Udio style briefs.*

[![MCP](https://img.shields.io/badge/MCP-2024--11--05-blue?style=for-the-badge)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![SIP](https://img.shields.io/badge/Built_on-SIP_v1.1.1-purple?style=for-the-badge)](https://starlightintelligence.org)

</div>

---

## What this is

Suno / Songcraft MCP Server is a **prompt strategy, lyric architecture, and music ideation layer** for AI-assisted music creation.

It helps an agent move from:

> “I want a nostalgic night-drive song that feels cinematic but still moves.”

to:

1. structured **Music DNA** (emotion, genre, textures, energy arc, vocal persona)
2. clearer creative constraints and seed patterns
3. a focused **Suno Style** field (<120 or custom length)
4. structured, human-grade **lyrics** with section markers (`[Verse]`, `[Chorus]`, `[Drop]`) and vocal delivery cues
5. an objective **Anti-Slop audit** scanning 60+ generic AI tropes with grounded rewrites
6. validated **provider-neutral session packets** (Suno supervised, Lyria clip/full, Eleven Music, fal MiniMax Music 3)

The server is intentionally **text-first and provider-independent**. It prepares high-quality creative briefs and packets; it does not claim to be an official Suno API or directly generate audio in Suno.

## Why it exists

Unofficial scraping and browser-cookie audio generation APIs for Suno are fragile, violate terms of service, and get blocked by Cloudflare.

Meanwhile, AI music tools are easy to prompt but difficult to direct consistently. A short prompt leaves critical decisions undefined:
- What is the emotional center and vibe DNA?
- Which instruments and textures lead?
- How should energy develop across the arrangement?
- Are the lyrics relying on predictable AI clichés ("echoes in the dark", "neon lights", "broken chains")?
- What vocal persona fits the idea?

This server gives any MCP client (Claude Code, Cursor, Hermes, Antigravity, OpenCode) a shared vocabulary and deterministic workflow for answering those questions before generation.

## Capabilities

| Capability | Status |
|---|---|
| Intent → structured Music DNA | Available (`map_music_dna`) |
| Music DNA → Suno-compatible Style field | Available (`build_style_field`) |
| Keyword and vibe suggestions | Available (`suggest_keywords`) |
| Intent clarity analysis | Available (`analyze_intent`) |
| Prompt and pattern matching | Available (`match_top_patterns`) |
| Provider session packet preparation | Available (`prepare_music_session`) |
| Structured lyric generation | Available (`craft_lyrics`) |
| Anti-Slop lyric audit & rewrites | Available (`de_slop_lyrics`) |
| Song dynamic structure & timeline | Available (`structure_song`) |
| High-density prompt compiler | Available (`compile_suno_prompt`) |
| Export unified Songcraft DNA packet | Available (`export_song_dna`) |
| Direct Suno audio generation | Not included (by design) |

> **Important:** This is a community project and is not affiliated with, endorsed by, or sponsored by Suno. Suno generation remains an external user-controlled workflow.

---

## Quickstart

### Claude Code / Cursor / Windsurf / Antigravity MCP Configuration

Add to your `claude.json` or `.mcp.json`:

```json
{
  "mcpServers": {
    "songcraft": {
      "command": "node",
      "args": ["/absolute/path/to/suno-mcp-server/dist/index.js"]
    }
  }
}
```

Or run the zero-dependency standalone runner directly:

```json
{
  "mcpServers": {
    "songcraft": {
      "command": "node",
      "args": ["/absolute/path/to/suno-mcp-server/bin/songcraft.mjs"]
    }
  }
}
```

*(Note: Both binary aliases `suno-mcp-server` and `songcraft-mcp` are provided).*

---

## MCP Tools

### Music DNA & Prompt Strategy Tools
| Tool | Purpose |
|---|---|
| `map_music_dna` | Convert free-text intent into structured emotion, genre, mood, textures, energy arc, vocal persona, production, and exclusions. |
| `build_style_field` | Compose a concise, generation-ready Suno Style field from Music DNA and optional dynamics instructions. |
| `suggest_keywords` | Suggest high-signal vocabulary for a vibe, genre, and mood. |
| `analyze_intent` | Score how complete an idea is across the Music DNA dimensions and identify what is missing. |
| `match_top_patterns` | Find related producer patterns and seed-library examples. |
| `prepare_music_session` | Validate an approved style/lyric session and compile provider packets (Suno, Lyria, Eleven Music, fal MiniMax). |

### Songcraft & Lyric Architecture Tools
| Tool | Parameters | Description |
|---|---|---|
| `craft_lyrics` | `theme`, `genre`, `structure`, `vocal_tags`, `anti_slop` | Generates structured lyrics with sections and vocal delivery cues. |
| `de_slop_lyrics` | `lyrics` | Audits lyrics against 60+ AI clichés, computes Slop Score (0-100), and suggests human-grade rewrites. |
| `structure_song` | `genre`, `tempo_bpm`, `target_duration_seconds` | Maps song timeline, energy curve (1-10), and arrangement layers. |
| `compile_suno_prompt` | `genre`, `mood`, `tempo_bpm`, `instrumentation`, `vocal_style` | Compiles compact style prompt (<120 chars), negative prompt, and Studio 2.0 plan. |
| `export_song_dna` | `title`, `theme`, `genre`, `lyrics`, `bpm`, `key` | Exports a unified Markdown/YAML Songcraft Packet with SIP v1.1.1 attestation. |

---

## Resources

| URI | Description |
|---|---|
| `library://prompts` | Seed prompt library index. |
| `library://prompts/{id}` | Individual prompt-library entry. |
| `musicdna://vocab` | Music DNA keyword taxonomy. |
| `musicdna://vibe-maps` | Vibe-to-DNA mappings. |
| `musicdna://top-patterns` | Producer and prompt pattern cards. |

## MCP Prompts

| Prompt | Purpose |
|---|---|
| `intent_to_dna` | Guide an agent through clarifying a vague musical idea. |
| `emotion_image_to_style` | Turn an image or visual description into Music DNA and a Style field. |

---

## Practical Example: De-Slopping Lyrics

```json
// Tool Call: de_slop_lyrics
{
  "lyrics": "I hear the echoes in the dark\nWalking beneath the neon lights\nBroken chains around my heart\nSearching for the light in endless nights"
}
```

**Response:**
> **Slop Index Score:** 75/100 (HIGH SLOP)  
> **Detected Clichés:** 4 found  
> - Line 2: "echoes in the dark" → [Atmospheric: echoes in the dark]  
> - Line 3: "neon lights" → [Atmospheric: neon lights]  
> - Line 4: "broken chains" → [Melodrama: broken chains]  
> - Line 5: "searching for the light" → [Filler: searching for the light]  
> 
> **Grounded Human-Grade Rewrite:**  
> I hear footsteps on the gravel drive  
> Walking beneath halogen diner signage  
> Unlocked deadbolts around my heart  
> Squinting through the windshield fog in endless nights

---

## Provider-neutral session preparation (0.3+)

`prepare_music_session` validates an approved style/lyric session and compiles Suno supervised, Lyria clip/full, Eleven Music or fal MiniMax Music 3 packets. It preserves lyrics, enforces provider duration/instrumental constraints, bounds candidate count and estimates the render cost. It makes no network request and cannot authorize credits, submit jobs, download audio, listen or publish. Its owner field is a planning label; an executor must authenticate the owner and reserve a host-approved budget.

Craft fundamentals and provider guidance are maintained in the public `frankxai/agentic-music-producer-os` docs. The packet compiler is canonical here in `src/engine/session-compiler.cjs`; an operated factory can vendor this pure compiler with a source revision/hash and parity tests. It contains no private canon or credentials.

## Modular MCP runtime (0.4+)

The server uses the official `@modelcontextprotocol/server` package and Zod4. Its runtime dependency graph contains the server and shared protocol implementation; the modular client is a development dependency. The legacy SDK is installed only in the isolated compatibility consumer, not in the project or published runtime. No HTTP gateway or authorization service is started.

The stdio entry uses `serveStdio`, which accepts legacy initialize clients and clients pinned to protocol 2026-07-28. Tool names, Music DNA, prompt resources and prepared-only provider packets retain their existing contracts.

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

---

## Standards & Attestation

Built on the **Starlight Intelligence Protocol (SIP) v1.1.1** and aligned with FrankX Music IS doctrine.

MIT License. Copyright © 2026 Frank Riemer / FrankX.
