# Phase 1 — Prompt Strategy Engine (PR scaffold)

**Branch**: `agent/hermes/mcp-phase1-prompt-strategy`  
**Worktree**: `C:\Users\frank\starlight\repos\.hermes-worktrees\suno-mcp-phase1`  
**Target package**: `@frankxai/suno-mcp-server` → `0.2.0`  
**SSOT**: `C:\Users\frank\starlight\music-ecosystem\mcp-specs\MCP_PHASES.md`  
**Architecture**: `C:\Users\frank\starlight\music-ecosystem\docs\MUSIC_ECOSYSTEM_ARCHITECTURE.md`  
**Status**: Implementable scaffold (text-first; no gateways; no bulk media)

---

## Goal

Ship the **articulation core** so agents can:

1. Map free-text intent → structured **Music DNA**
2. Compose **Suno Style** fields at seed-library quality
3. Read **library://prompts** (Neon Horizons, Liminal Tides)

## Acceptance (from MCP_PHASES.md)

| Criterion | Implementation |
|-----------|----------------|
| `map_music_dna` returns structured DNA | `src/tools/phase1.ts` + `src/engine/dna-mapper.ts` + Zod `MusicDnaSchema` |
| `build_style_field` Style ≈ seed quality | `src/engine/style-composer.ts` + formula + journey |
| Resource `library://prompts` lists seeds | `src/data/seed-library.json` + `server.resource` |
| Docs + examples | README + this file |
| Unit tests for validation schemas | `tests/phase1.test.ts` |

## Layout

```
src/
  index.ts                 # stdio entry
  server.ts                # McpServer: tools + resources + prompts
  schemas/
    music-dna.ts           # Zod: DNA, style, intent, patterns
    library.ts             # Zod: library entries
  engine/
    dna-mapper.ts
    style-composer.ts
    keyword-suggester.ts
    intent-analyzer.ts
    pattern-matcher.ts
    library.ts
  tools/
    phase1.ts              # validated handlers
  data/
    seed-library.json
    vocab.json
    vibe-maps.json
    top-patterns.json
tests/
  phase1.test.ts
docs/PHASE1.md             # this file
```

## Tools

| Tool | Inputs (key) | Output |
|------|----------------|--------|
| `map_music_dna` | `text`, optional `image_url`, `genre_hint`, `bpm_hint`, `instrumental` | `{ success, dna, notes }` |
| `build_style_field` | `dna`, optional `journey`, `max_chars` | `{ style_field, components, formula, quality_notes }` |
| `suggest_keywords` | `vibe`, optional `genre`, `mood[]` | `{ keywords, sources, vibe_match }` |
| `analyze_intent` | `intent_text` | `{ clarity_score, missing_dimensions, suggestions, comparable_library_ids }` |
| `match_top_patterns` | `query`, `limit` | `{ matches, library_hits }` |

### Zod validation notes

- Parse **at tool boundary** (`*.parse(args)`); never trust free LLM objects.
- Bound string lengths and array sizes (Style field pollution / prompt injection surface).
- `image_url` accepted but **not fetched** (disk TIGHT; text-first).
- Nested `dna` re-validated with `MusicDnaSchema` inside `build_style_field`.

## Resources

| URI | Content |
|-----|---------|
| `library://prompts` | Full seed index JSON |
| `library://prompts/{id}` | Single entry (neon-horizons-001, liminal-tides-001) |
| `musicdna://vocab` | Keyword taxonomy |
| `musicdna://vibe-maps` | Vibe → partial DNA |
| `musicdna://top-patterns` | Producer pattern cards |

## Prompts

- `intent_to_dna` — guided articulation coach
- `emotion_image_to_style` — image description → DNA → Style

## Local verify (no gateway)

```bash
cd C:/Users/frank/starlight/repos/.hermes-worktrees/suno-mcp-phase1
pnpm install   # or npm install
pnpm run typecheck
pnpm run test:phase1
pnpm run build
# Optional smoke (stdio; Ctrl+C): pnpm start
```

## MCP client config

```json
{
  "music-mcp": {
    "command": "node",
    "args": ["C:/Users/frank/starlight/repos/.hermes-worktrees/suno-mcp-phase1/dist/index.js"],
    "env": {}
  }
}
```

Or after publish: `npx @frankxai/suno-mcp-server`.

## Golden path (agent)

```
user intent
  → analyze_intent
  → map_music_dna
  → build_style_field
  → read library://prompts for comparison
  → (Phase 6) route_generation / suno_generate stub
```

## Out of scope (later phases)

- Lyrics, arrangement, album, lore (Phases 2–5)
- Live Suno API / browser generation (Phase 6)
- Cover art / video / analytics (Phase 7)
- HTTP/SSE gateways

## PR checklist

- [ ] Branch off `origin/main` (Hermes worktree; do not commit on Codex preserve branch)
- [ ] package.json `0.2.0` + MCP deps
- [ ] Phase 1 tools + resources + prompts
- [ ] Seed library JSON aligned with music-ecosystem seed
- [ ] tests pass
- [ ] README documents Phase 1 tools
- [ ] No secrets; no media blobs

## Risks

- Disk TIGHT: avoid `node_modules` fanout on multiple worktrees; prefer one install.
- SDK API: uses `@modelcontextprotocol/sdk` `McpServer` high-level API (`server.tool` / `server.resource` / `server.prompt`). If SDK minor drifts, pin version in lockfile.
- Heuristic mapper is deterministic MVP — agents should refine DNA before generation.
