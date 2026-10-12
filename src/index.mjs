#!/usr/bin/env node
/**
 * @frankxai/songcraft-mcp (alias: suno-mcp-server)
 * The Sovereign AI Songwriting, Lyric Architecture & Music DNA Engine for MCP.
 * Built on SIP — Starlight Intelligence Protocol v1.1.1.
 */

import * as readline from 'node:readline';
import {
  craftLyrics,
  deSlopLyrics,
  structureSong,
  compileSunoPrompt,
  exportSongDna
} from './engine/songcraft.mjs';

const SERVER_NAME = 'songcraft-mcp';
const SERVER_VERSION = '1.0.0';

export const TOOLS = [
  {
    name: 'craft_lyrics',
    description: 'Craft structured, rights-safe, emotionally resonant song lyrics with section tags and vocal performance cues. Filters generic AI songwriting clichés.',
    inputSchema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          description: 'Core narrative premise, emotional dilemma, or thesis for the song.'
        },
        genre: {
          type: 'string',
          description: 'Target musical landscape (e.g., cinematic, indie-rock, synthwave, neo-soul, melodic-techno, ambient-folk).'
        },
        structure: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of song sections (default: [Intro, Verse 1, Pre-Chorus, Chorus, Verse 2, Chorus, Bridge, Chorus, Outro]).'
        },
        vocal_tags: {
          type: 'boolean',
          description: 'Embed performance cue brackets like [Whisper], [Belting], [Dynamic Drop]. Default true.'
        },
        anti_slop: {
          type: 'boolean',
          description: 'Enforce anti-slop audit against 60+ generic AI lyric tropes. Default true.'
        }
      },
      required: ['theme']
    }
  },
  {
    name: 'de_slop_lyrics',
    description: 'Audit song lyrics against 60+ generic AI lyric clichés (e.g. "echoes in the dark", "neon lights", "broken chains"), calculate a Slop Index (0-100), and provide grounded rewrites.',
    inputSchema: {
      type: 'object',
      properties: {
        lyrics: {
          type: 'string',
          description: 'Full song lyrics text to inspect and clean.'
        }
      },
      required: ['lyrics']
    }
  },
  {
    name: 'structure_song',
    description: 'Generate a complete song timeline with dynamic energy curves, section durations, BPM, and transition layers.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Musical genre or style (e.g. cinematic, synthwave, indie-rock, neo-soul).'
        },
        tempo_bpm: {
          type: 'number',
          description: 'Target tempo in BPM (optional; auto-derived from genre if omitted).'
        },
        target_duration_seconds: {
          type: 'number',
          description: 'Target duration in seconds (default: 210).'
        }
      },
      required: ['genre']
    }
  },
  {
    name: 'compile_suno_prompt',
    description: 'Compile a rights-safe, high-density Style Prompt for Suno v4/v5/v5.5 and Udio without artist imitation, plus negative exclusions and Studio 2.0 instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Primary and sub-genre acoustic descriptors.'
        },
        mood: {
          type: 'string',
          description: 'Emotional atmosphere and aesthetic tone.'
        },
        tempo_bpm: {
          type: 'number',
          description: 'Beats per minute.'
        },
        instrumentation: {
          type: 'string',
          description: 'Real-world acoustic and synthesized instruments.'
        },
        vocal_style: {
          type: 'string',
          description: 'Vocal texture, delivery style, and staging without named artist imitation.'
        },
        model_version: {
          type: 'string',
          description: 'Target generation engine (e.g., suno-v5.5, suno-v4, udio). Default suno-v5.5.'
        }
      },
      required: ['genre', 'mood']
    }
  },
  {
    name: 'export_song_dna',
    description: 'Export a unified, production-ready Songcraft Packet (Markdown / YAML) containing Track Contract, Generation Prompt, Authored Lyrics, and Studio 2.0 Plan conforming to SIP § 1.1.1.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the composition.'
        },
        theme: {
          type: 'string',
          description: 'Core narrative premise or thematic statement.'
        },
        genre: {
          type: 'string',
          description: 'Musical style.'
        },
        lyrics: {
          type: 'string',
          description: 'Full section-tagged lyrics.'
        },
        bpm: {
          type: 'number',
          description: 'BPM.'
        },
        key: {
          type: 'string',
          description: 'Musical key and mode.'
        }
      },
      required: ['title', 'genre', 'lyrics']
    }
  }
];

export async function handleToolCall(name, args) {
  switch (name) {
    case 'craft_lyrics': {
      const res = craftLyrics({
        theme: args.theme,
        genre: args.genre,
        structure: args.structure,
        vocalTags: args.vocal_tags ?? true,
        antiSlop: args.anti_slop ?? true
      });
      return {
        content: [
          {
            type: 'text',
            text: `### Authored Lyrics for "${res.theme}" (${res.genre})\n**Slop Index Score:** ${res.slopScore}/100\n\n${res.lyrics}\n\n*${res.doctrine}*`
          }
        ]
      };
    }
    case 'de_slop_lyrics': {
      const res = deSlopLyrics(args.lyrics);
      const report = `### Anti-Slop Lyric Audit
**Slop Index Score:** ${res.slopScore}/100 (${res.slopScore === 0 ? 'PRISTINE' : res.slopScore < 30 ? 'LOW RISK' : 'HIGH SLOP'})
**Detected Clichés:** ${res.detectedCliches.length} found
${res.detectedCliches.map(c => `- Line ${c.line}: "${c.text}" → [${c.category}: ${c.cliche}]`).join('\n')}

**Starlight Weaver Critique:**
${res.critique}

${res.detectedCliches.length > 0 ? `### Grounded Human-Grade Rewrite:\n${res.rewrittenLyrics}` : ''}
`;
      return {
        content: [{ type: 'text', text: report }]
      };
    }
    case 'structure_song': {
      const res = structureSong({
        genre: args.genre,
        tempoBpm: args.tempo_bpm,
        targetDurationSeconds: args.target_duration_seconds
      });
      const table = `### Song Dynamic Structure: ${res.genre} (${res.bpm} BPM)
| Section | Range | Energy | Instrumentation Layer | Vocal Staging |
|---|---|---|---|---|
${res.timeline.map(t => `| **${t.section}** | ${t.start} - ${t.end} | ${t.energy}/10 | ${t.layers} | ${t.vocal} |`).join('\n')}

*Total Estimated Duration: ~${res.estimatedTotalSeconds}s across ${res.sectionCount} sections.*
`;
      return {
        content: [{ type: 'text', text: table }]
      };
    }
    case 'compile_suno_prompt': {
      const res = compileSunoPrompt({
        genre: args.genre,
        mood: args.mood,
        tempoBpm: args.tempo_bpm,
        instrumentation: args.instrumentation,
        vocalStyle: args.vocal_style,
        modelVersion: args.model_version
      });
      const text = `### Suno / Udio Generation Prompt Packet
**Style of Music Prompt (Copy to Suno Style Field):**
\`\`\`text
${res.stylePrompt}
\`\`\`

**Negative / Excluded Prompt:**
\`\`\`text
${res.negativePrompt}
\`\`\`

**Vocal Direction:** ${res.vocalDirection}
**Suggested Tempo:** ${res.suggestedBpm} BPM

**Studio 2.0 Separation Plan:**
- Target Engine: ${res.studioPlan.targetEngine}
- Take Selection Rule: ${res.studioPlan.takeSelectionCriteria}
- Low-End & Mix Routing: ${res.studioPlan.arrangementNotes}
- Stem Export Targets: ${res.studioPlan.stemsExport.join(', ')}
`;
      return {
        content: [{ type: 'text', text: text }]
      };
    }
    case 'export_song_dna': {
      const res = exportSongDna({
        title: args.title,
        theme: args.theme,
        genre: args.genre,
        lyrics: args.lyrics,
        bpm: args.bpm,
        key: args.key
      });
      return {
        content: [{ type: 'text', text: res.packetMarkdown }]
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Start stdio JSON-RPC 2.0 loop
 */
export function startServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const send = (msg) => {
    process.stdout.write(JSON.stringify(msg) + '\n');
  };

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req;
    try {
      req = JSON.parse(trimmed);
    } catch {
      return;
    }

    const { id, method, params } = req;

    try {
      if (method === 'initialize') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            }
          }
        });
      } else if (method === 'notifications/initialized') {
        // Notification - no response needed
      } else if (method === 'ping') {
        send({ jsonrpc: '2.0', id, result: {} });
      } else if (method === 'tools/list') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        });
      } else if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const result = await handleToolCall(toolName, toolArgs);
        send({
          jsonrpc: '2.0',
          id,
          result
        });
      } else {
        if (id !== undefined) {
          send({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          });
        }
      }
    } catch (err) {
      if (id !== undefined) {
        send({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: err.message || String(err)
          }
        });
      }
    }
  });

  process.stderr.write(`[${SERVER_NAME}] Songcraft MCP Server v${SERVER_VERSION} listening on stdio\n`);
}
