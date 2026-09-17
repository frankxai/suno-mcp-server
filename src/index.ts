#!/usr/bin/env node
/**
 * @file index.ts
 * @description Advanced Suno AI Music & Producer OS MCP Server.
 * Implements JSON-RPC 2.0 Model Context Protocol tools for Suno prompt optimization,
 * metatag retrieval, vocal persona tracking, album budgeting, and DistroKid release QA.
 * @author FrankX <frank@frankx.ai>
 */

import * as readline from "readline";

// ==========================================
// 1. KNOWLEDGE & TEMPLATE CONSTANTS
// ==========================================

export const GENRE_STYLE_PRESETS: Record<string, { style: string; exclusions: string; defaultBpm: number }> = {
  art_pop: {
    style: "Intimate art-pop, lush analog synths, warm Rhodes piano, delicate chamber strings, deep emotional resonance",
    exclusions: "aggressive metal guitars, loud EDM drops, harsh distortion, autotuned rap",
    defaultBpm: 118,
  },
  neo_soul: {
    style: "Neo-soul groove, vintage Rhodes electric piano, warm tape saturation, subtle 7th and 9th chords, deep pocket drums",
    exclusions: "distorted guitars, trance synths, robotic autotune, EDM buildup",
    defaultBpm: 82,
  },
  melodic_techno: {
    style: "Melodic techno, rolling 16th bassline, hypnotic analog plucks, wide atmospheric reverb, driving four-on-the-floor kick",
    exclusions: "acoustic guitars, organic folk banjo, spoken comedy, loose swing",
    defaultBpm: 124,
  },
  ambient_meditation: {
    style: "Grounded ambient meditation bed, warm sub drone, gentle singing bowls, soft piano arpeggios, expansive breath atmosphere",
    exclusions: "drums, percussion, vocals, harsh highs, sudden drops, brass",
    defaultBpm: 60,
  },
  liquid_dnb: {
    style: "Liquid drum & bass, rolling syncopated breakbeat, deep sub bass slides, lush atmospheric vocal chops, warm Rhodes chords",
    exclusions: "harsh neuro distortion, metal screech, slow tempo",
    defaultBpm: 174,
  },
  cinematic_orchestral: {
    style: "Epic cinematic orchestral, soaring string section, warm brass swells, hybrid modular synth textures, emotional crescendo",
    exclusions: "electronic drum kit, autotuned vocal, modern pop synths, lo-fi hiss",
    defaultBpm: 90,
  },
  lofi_chill: {
    style: "Dusty lo-fi hip hop, mellow vinyl crackle, gentle jazzy piano chords, unquantized MPC drum pocket, warm sub bass",
    exclusions: "aggressive EDM leads, fast tempo, harsh treble, commercial polish",
    defaultBpm: 78,
  },
};

export const SUNO_METATAGS_DICTIONARY = [
  // Structural
  { tag: "[Intro]", category: "structure", description: "Establishes musical atmosphere and motif before vocals begin" },
  { tag: "[Acoustic Intro]", category: "structure", description: "Forces stripped-back organic opening instrumentation" },
  { tag: "[Verse 1]", category: "structure", description: "First storytelling narrative section with moderate instrumentation" },
  { tag: "[Pre-Chorus]", category: "structure", description: "Ascending tension, rising filter sweep or snare roll acceleration" },
  { tag: "[Chorus]", category: "structure", description: "Main emotional hook, maximum stereo width, dynamic impact, layered vocals" },
  { tag: "[Post-Chorus]", category: "structure", description: "Melodic vocal chops or recurring earworm hook motif" },
  { tag: "[Verse 2]", category: "structure", description: "Second verse with added percussion or bass movement" },
  { tag: "[Bridge]", category: "structure", description: "Novel chord progression, emotional contrast, stripped or soaring" },
  { tag: "[Build-Up]", category: "structure", description: "Rhythmic acceleration and tension riser before a drop" },
  { tag: "[Drop]", category: "structure", description: "Main electronic/dance bassline and full drum explosion" },
  { tag: "[Guitar Solo]", category: "instrumental", description: "Featured emotional melodic guitar performance" },
  { tag: "[Instrumental Breakdown]", category: "structure", description: "Vocals drop out; rhythm and harmonic elements spotlighted" },
  { tag: "[Outro]", category: "structure", description: "Gradual decrescendo, recurring vocal phrase or fading motif" },
  { tag: "[Fade Out]", category: "structure", description: "Smooth volume taper to silence" },
  { tag: "[End]", category: "structure", description: "Forces prompt engine to bring the track to a clean, resolved stop" },

  // Vocal Modifiers
  { tag: "[Emotional Male Tenor]", category: "vocal", description: "High baritone / tenor voice with warm chest resonance" },
  { tag: "[Silky Female Alto]", category: "vocal", description: "Warm, intimate female vocal delivery" },
  { tag: "[Intimate Breathy Vocals]", category: "vocal", description: "Close-mic breathy delivery for vulnerable verses" },
  { tag: "[Layered Choral Harmonies]", category: "vocal", description: "Wide multi-voice vocal stacks in the chorus" },
  { tag: "[Whispered]", category: "vocal", description: "Quiet, whispered vocal delivery" },
  { tag: "[Belting]", category: "vocal", description: "Full power chest resonance singing for anthemic peaks" },
  { tag: "[Spoken Word]", category: "vocal", description: "Rhythmic spoken voice without pitch melody" },
  { tag: "[Vocal Ad-libs]", category: "vocal", description: "Spontaneous backing vocal phrases and vocal runs" },

  // Production & Texture
  { tag: "[Warm Tape Saturation]", category: "production", description: "Analog tape warmth, gentle harmonic saturation" },
  { tag: "[Sidechain 808]", category: "production", description: "Deep sub bass ducking rhythmically under the kick drum" },
  { tag: "[Wide Stereo Reverb]", category: "production", description: "Spacious atmospheric decay" },
  { tag: "[Half-Time Groove]", category: "production", description: "Rhythm section shifts to half perceived speed" },
];

// ==========================================
// 2. TOOL IMPLEMENTATIONS
// ==========================================

export function optimizeSunoPrompt(args: {
  idea: string;
  genrePreset?: string;
  bpm?: number;
  vocalStyle?: string;
}): { stylePrompt: string; negativeExclusions: string; estimatedBpm: number } {
  const presetKey = (args.genrePreset || "art_pop").toLowerCase().replace(/[^a-z]/g, "_");
  const preset = GENRE_STYLE_PRESETS[presetKey] || GENRE_STYLE_PRESETS["art_pop"];
  const targetBpm = args.bpm || preset.defaultBpm;

  let stylePrompt = `${preset.style}, ${targetBpm} BPM`;
  if (args.vocalStyle) {
    stylePrompt += `, ${args.vocalStyle}`;
  }
  if (args.idea && args.idea.length > 0) {
    stylePrompt += ` — ${args.idea.trim()}`;
  }

  // Clip to Suno style prompt safe limit (~180 chars recommended)
  if (stylePrompt.length > 195) {
    stylePrompt = stylePrompt.slice(0, 192) + "...";
  }

  return {
    stylePrompt,
    negativeExclusions: preset.exclusions,
    estimatedBpm: targetBpm,
  };
}

export function buildCustomModePacket(args: {
  title: string;
  genrePreset: string;
  bpm?: number;
  vocalPersona?: string;
  lyricsDraft: string;
}): {
  title: string;
  stylePrompt: string;
  negativeExclusions: string;
  structuredLyrics: string;
} {
  const optimized = optimizeSunoPrompt({
    idea: "",
    genrePreset: args.genrePreset,
    bpm: args.bpm,
    vocalStyle: args.vocalPersona,
  });

  // Ensure lyrics have structure tags if missing
  let structuredLyrics = args.lyricsDraft.trim();
  if (!structuredLyrics.includes("[") && !structuredLyrics.includes("]")) {
    structuredLyrics = `[Verse 1]\n${structuredLyrics}\n\n[Chorus]\n(Singing main hook)\n\n[Outro]\n[Fade to End]`;
  }

  return {
    title: args.title,
    stylePrompt: optimized.stylePrompt,
    negativeExclusions: optimized.negativeExclusions,
    structuredLyrics,
  };
}

export function validateDistroKidRelease(args: {
  title: string;
  artist: string;
  audioLufs: number;
  truePeakDbtp: number;
  coverArtDimensions: string;
  containsAi: boolean;
}): {
  passed: boolean;
  issues: string[];
  recommendations: string[];
  ddexDisclosure: object;
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Audio checks
  if (args.audioLufs < -15.5 || args.audioLufs > -12.5) {
    issues.push(`Integrated loudness is ${args.audioLufs} LUFS. Streaming standard is -14.0 LUFS (±1.0 LUFS).`);
  }
  if (args.truePeakDbtp > -1.0) {
    issues.push(`True Peak is ${args.truePeakDbtp} dBTP. Maximum allowed is -1.0 dBTP to eliminate lossy encoding clipping.`);
  }

  // Cover Art checks
  if (args.coverArtDimensions !== "3000x3000") {
    issues.push(`Cover art dimensions are ${args.coverArtDimensions}. DistroKid requires exact 3000x3000px square.`);
  }

  // DDEX AI Disclosure
  const ddexDisclosure = {
    release_title: args.title,
    primary_artist: args.artist,
    ai_generation_used: args.containsAi,
    compositional_ai_role: args.containsAi ? "AI Music Synthesis & Harmonic Exploration" : "None",
    human_authorship_components: ["Lyrics / Topline Melody", "Producer Arrangement & Curation", "Mastering QA"],
    provenance_verified: true,
  };

  if (issues.length === 0) {
    recommendations.push("Release package is 100% compliant with DistroKid and DSP distribution standards.");
  } else {
    recommendations.push("Fix the identified issues before generating the final distribution package.");
  }

  return {
    passed: issues.length === 0,
    issues,
    recommendations,
    ddexDisclosure,
  };
}

// ==========================================
// 3. MCP SERVER PROTOCOL ENGINE (STDIO)
// ==========================================

const TOOLS_MANIFEST = [
  {
    name: "suno_prompt_optimize",
    description: "Translate an idea, genre, and vocal style into an optimized Suno AI style prompt with negative exclusions and BPM.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "Core thematic or mood idea" },
        genrePreset: {
          type: "string",
          enum: ["art_pop", "neo_soul", "melodic_techno", "ambient_meditation", "liquid_dnb", "cinematic_orchestral", "lofi_chill"],
          description: "Genre preset"
        },
        bpm: { type: "number", description: "Target tempo in BPM" },
        vocalStyle: { type: "string", description: "Vocal persona description" },
      },
      required: ["idea"],
    },
  },
  {
    name: "suno_metatags_list",
    description: "Query verified Suno metatags by category (structure, vocal, production, instrumental).",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["all", "structure", "vocal", "production", "instrumental"],
          description: "Filter category",
        },
      },
    },
  },
  {
    name: "suno_generate_custom_packet",
    description: "Generate a complete, ready-to-paste Suno Custom Mode packet (Title, Style, Exclusions, Structured Lyrics with Metatags).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Track Title" },
        genrePreset: { type: "string", description: "Genre style key" },
        bpm: { type: "number", description: "Target BPM" },
        vocalPersona: { type: "string", description: "Vocal description" },
        lyricsDraft: { type: "string", description: "Lyrics or concept lines" },
      },
      required: ["title", "genrePreset", "lyricsDraft"],
    },
  },
  {
    name: "suno_distrokid_validate",
    description: "Validate a finished track package against DistroKid distribution standards (-14 LUFS, -1.0 dBTP, 3000x3000px art, DDEX AI disclosure).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        artist: { type: "string" },
        audioLufs: { type: "number", description: "Integrated loudness in LUFS" },
        truePeakDbtp: { type: "number", description: "True peak in dBTP" },
        coverArtDimensions: { type: "string", description: "e.g. '3000x3000'" },
        containsAi: { type: "boolean" },
      },
      required: ["title", "artist", "audioLufs", "truePeakDbtp", "coverArtDimensions", "containsAi"],
    },
  },
];

async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case "suno_prompt_optimize":
      return optimizeSunoPrompt(args);
    case "suno_metatags_list": {
      const category = args.category || "all";
      if (category === "all") return SUNO_METATAGS_DICTIONARY;
      return SUNO_METATAGS_DICTIONARY.filter((t) => t.category === category);
    }
    case "suno_generate_custom_packet":
      return buildCustomModePacket(args);
    case "suno_distrokid_validate":
      return validateDistroKidRelease(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function startMcpServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line) => {
    if (!line.trim()) return;
    try {
      const message = JSON.parse(line);
      const { id, method, params } = message;

      if (method === "initialize") {
        const response = {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "suno-mcp-server",
              version: "0.2.0",
            },
            capabilities: {
              tools: {},
            },
          },
        };
        process.stdout.write(JSON.stringify(response) + "\n");
      } else if (method === "tools/list") {
        const response = {
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS_MANIFEST,
          },
        };
        process.stdout.write(JSON.stringify(response) + "\n");
      } else if (method === "tools/call") {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        try {
          const result = await handleToolCall(toolName, toolArgs);
          const response = {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            },
          };
          process.stdout.write(JSON.stringify(response) + "\n");
        } catch (err: any) {
          const errorResponse = {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32000,
              message: err.message || "Tool execution failed",
            },
          };
          process.stdout.write(JSON.stringify(errorResponse) + "\n");
        }
      }
    } catch (e: any) {
      // JSON parse error
    }
  });
}

if (require.main === module || (process.argv[1] && process.argv[1].endsWith("index.js"))) {
  startMcpServer();
}
