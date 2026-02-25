<div align="center">

# Suno MCP Server

**AI music generation from your coding agent**

*Create, iterate, and manage AI music directly from Claude Code, Cursor, or any MCP client.*

[![MCP](https://img.shields.io/badge/MCP-server-blue?style=for-the-badge)](https://modelcontextprotocol.io)
[![Suno](https://img.shields.io/badge/Suno-AI_Music-purple?style=for-the-badge)](https://suno.com)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Why?

AI music generation is powerful but disconnected from development workflows. This MCP server bridges the gap — generate music, manage tracks, and iterate on compositions without leaving your coding agent.

```
You: "Create an ambient electronic track for my app's loading screen"
→ Suno MCP generates track with optimized prompt
→ Returns audio URL + metadata
→ You integrate directly into your project
```

## Features

- **Generate tracks** with optimized Suno prompts from natural language
- **Genre expertise** built-in — 50+ genre prompt templates
- **Iterate** on existing tracks (extend, remix, style transfer)
- **Manage** your Suno library from the CLI
- **Batch generate** multiple variations
- **Commercial licensing** metadata tracking

## Install

```bash
npm install -g @frankxai/suno-mcp-server
```

Or add to your MCP config:

```json
{
  "suno-mcp": {
    "command": "npx",
    "args": ["@frankxai/suno-mcp-server"],
    "env": {
      "SUNO_API_KEY": "your-key"
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|------------|
| `suno_generate` | Generate a new track from description |
| `suno_extend` | Extend an existing track |
| `suno_remix` | Create variation of existing track |
| `suno_list` | List your generated tracks |
| `suno_get` | Get track details and download URL |
| `suno_prompt_optimize` | Optimize a natural language description into Suno prompt format |

## Prompt Engineering

The server includes built-in prompt optimization for Suno:

```
Input:  "relaxing piano music for a meditation app"
Output: "[Ambient Piano] Gentle flowing arpeggios, soft sustain pedal,
         warm reverb, 60 BPM, meditation-friendly, no vocals,
         clean production, stereo width"
```

Genre templates cover:
- Electronic (ambient, synthwave, techno, house, DnB)
- Hip-hop (boom bap, trap, lo-fi, conscious)
- Rock (indie, post-rock, shoegaze, metal)
- Classical (orchestral, piano solo, chamber)
- World (afrobeat, latin, celtic, middle eastern)
- Experimental (glitch, IDM, noise, drone)

## Part of the ACOS Ecosystem

This MCP server integrates with the [Agentic Creator OS](https://github.com/frankxai/agentic-creator-os) music-lab plugin for full music production workflows.

## Status

Early development. Core MCP interface and prompt optimization engine are being built. Contributions welcome.

## License

MIT
