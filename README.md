<div align="center">

# Suno MCP Server · Music Superpowers

**Phase 1 live: Prompt Strategy Engine** — map intent → Music DNA → Suno Style  
*Create, articulate, and prepare AI music from Claude Code, Cursor, Hermes, or any MCP client.*

[![MCP](https://img.shields.io/badge/MCP-server-blue?style=for-the-badge)](https://modelcontextprotocol.io)
[![Suno](https://img.shields.io/badge/Suno-AI_Music-purple?style=for-the-badge)](https://suno.com)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Why?

AI music generation fails when intent is vague. This server’s first job is **articulation**: structured Music DNA, keyword strategy, and Style fields that match high-signal library examples (Neon Horizons, Liminal Tides). Generation routing comes later (Phase 6).

```
You: "Neon night drive, nostalgic but driving"
→ map_music_dna → structured DNA
→ build_style_field → full Suno Style
→ compare to library://prompts
→ (later) generate_suno / route_generation
```

## Status

| Phase | Name | Status |
|-------|------|--------|
| **1** | Prompt Strategy Engine | **Scaffolded (this release)** |
| 2 | Lyrics | Planned |
| 3 | Composition & Vibe | Planned |
| 4 | Album | Planned |
| 5 | Story & Lore | Planned |
| 6 | Generation Router | Stub later |
| 7 | Assets & Analytics | Planned |

See `docs/PHASE1.md` for full tool/resource contracts.

## Install

```bash
# from repo / worktree
pnpm install
pnpm run build
pnpm start   # stdio MCP server
```

MCP config (local worktree example):

```json
{
  "music-mcp": {
    "command": "node",
    "args": ["C:/Users/frank/starlight/repos/.hermes-worktrees/suno-mcp-phase1/dist/index.js"]
  }
}
```

Published package form:

```json
{
  "music-mcp": {
    "command": "npx",
    "args": ["@frankxai/suno-mcp-server"],
    "env": {
      "SUNO_API_KEY": "optional-phase-6"
    }
  }
}
```

## Phase 1 MCP Tools

| Tool | Description |
|------|-------------|
| `map_music_dna` | Extract structured Music DNA from free text (optional `image_url` as text hint only) |
| `build_style_field` | Compose full Suno Style from DNA + optional journey overrides |
| `suggest_keywords` | Keyword suggestions for a vibe / genre / mood |
| `analyze_intent` | Clarity score vs DNA dimensions + library examples |
| `match_top_patterns` | Similar pattern cards + library hits |

### Example: map → style

```json
// map_music_dna
{
  "text": "Neon night drive, 80s retro-futuristic synthwave, male baritone with slight rasp, starts sparse with pulsing bass",
  "bpm_hint": 128
}
```

```json
// build_style_field (dna = previous result)
{
  "dna": { "...": "from map_music_dna" },
  "max_chars": 450
}
```

**Style formula**:  
`Genre + Mood + Era + Instruments + Vocal Persona + Production + Dynamics Journey`

## Resources

| URI | Description |
|-----|-------------|
| `library://prompts` | Seed prompt library (Neon Horizons, Liminal Tides) |
| `library://prompts/{id}` | Single library entry |
| `musicdna://vocab` | Keyword taxonomy |
| `musicdna://vibe-maps` | Vibe → partial DNA cards |
| `musicdna://top-patterns` | Producer pattern cards |

## Prompts

| Prompt | Purpose |
|--------|---------|
| `intent_to_dna` | Guided articulation coach |
| `emotion_image_to_style` | Image description → DNA → Style |

## Development

```bash
pnpm run typecheck
pnpm run test:phase1
pnpm run build
```

**Constraints**: text-first, stdio only (no HTTP gateway), no bulk media downloads, credentials only via env for later phases.

## Ecosystem

- Music architecture SSOT: Starlight `music-ecosystem/docs/MUSIC_ECOSYSTEM_ARCHITECTURE.md`
- Phase specs: `music-ecosystem/mcp-specs/MCP_PHASES.md`
- Seed library source: `music-ecosystem/prompt-library/SEED_PROMPT_LIBRARY.md`
- Hermes skills: `suno-e2e-workflow`, `songwriting-and-ai-music`

## License

MIT
