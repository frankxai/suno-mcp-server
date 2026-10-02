/**
 * Music MCP server — Phase 1 Prompt Strategy Engine
 * Uses official @modelcontextprotocol/sdk (stdio transport).
 *
 * Do not start network gateways here — stdio only.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  handleMapMusicDna,
  handleBuildStyleField,
  handleSuggestKeywords,
  handleAnalyzeIntent,
  handleMatchTopPatterns,
} from "./tools/phase1.js";
import {
  RESOURCE_URIS,
  getLibraryIndex,
  getLibraryEntry,
  listLibraryEntries,
  getVocab,
  getVibeMaps,
  getTopPatterns,
} from "./engine/library.js";
import {
  EnergyArcSchema,
  VocalPersonaSchema,
  MusicDnaSchema,
} from "./schemas/music-dna.js";

import { SessionShape, handlePrepareMusicSession } from "./tools/session.js";

export const SERVER_NAME = "music-mcp";
export const SERVER_VERSION = "0.3.0";

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorContent(err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Unknown error";
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: false,
            error: {
              message,
              recoverable: true,
              suggested_action:
                "Validate inputs against schemas; check required fields.",
            },
          },
          null,
          2,
        ),
      },
    ],
  };
}

/** Nested DNA shape for build_style_field tool input (mirrors MusicDnaSchema) */
const DnaInputShape = {
  core_emotion: z.array(z.string()).min(1).max(5),
  genre: z.string().min(1).max(120),
  subgenres: z.array(z.string()).max(6).optional().default([]),
  bpm: z.number().int().min(40).max(240).optional(),
  key: z.string().max(24).optional(),
  mood: z.array(z.string()).min(1).max(8),
  vibe_dna: z.array(z.string()).min(1).max(12),
  textures: z.array(z.string()).max(12).optional().default([]),
  energy_arc: EnergyArcSchema,
  vocal: VocalPersonaSchema.optional(),
  era: z.string().max(64).optional(),
  production: z.array(z.string()).max(8).optional().default([]),
  exclude_styles: z.array(z.string()).max(12).optional().default([]),
  confidence: z.number().min(0).max(1),
  source_summary: z.string().max(500).optional(),
};

export function createMusicMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.tool("prepare_music_session", "Prepare a validated provider-neutral music packet; no API calls, credit authorization or audio verdict.", SessionShape, async (args) => {
    try { return jsonContent(handlePrepareMusicSession(args)); }
    catch (error) { return errorContent(error); }
  });

  // ─── Tools: Phase 1 ───────────────────────────────────────────────

  server.tool(
    "map_music_dna",
    "Extract structured Music DNA from free text (optional image_url as text hint only — no media download). Returns emotion, genre, textures, energy arc, vocal persona, exclude styles, confidence.",
    {
      text: z
        .string()
        .min(1)
        .max(4000)
        .describe("Free-text intent, vibe description, or image caption"),
      image_url: z
        .string()
        .url()
        .optional()
        .describe("Optional image URL — Phase 1 text-hint only"),
      genre_hint: z.string().max(120).optional(),
      bpm_hint: z.number().int().min(40).max(240).optional(),
      instrumental: z.boolean().optional().default(false),
    },
    async (args) => {
      try {
        return jsonContent(handleMapMusicDna(args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  server.tool(
    "build_style_field",
    "Compose a full Suno Custom Style field from Music DNA (+ optional journey overrides). Quality target: seed library Neon Horizons / Liminal Tides.",
    {
      dna: z
        .object(DnaInputShape)
        .describe("Structured Music DNA from map_music_dna"),
      journey: z
        .object({
          intro: z.string().max(200).optional(),
          build: z.string().max(200).optional(),
          peak: z.string().max(200).optional(),
          bridge: z.string().max(200).optional(),
          outro: z.string().max(200).optional(),
        })
        .optional()
        .describe("Optional dynamics journey overrides"),
      max_chars: z.number().int().min(80).max(1000).optional().default(450),
      include_bpm_key: z.boolean().optional().default(true),
      include_exclude: z.boolean().optional().default(false),
    },
    async (args) => {
      try {
        // Ensure nested dna passes MusicDnaSchema defaults
        const dna = MusicDnaSchema.parse(args.dna);
        return jsonContent(
          handleBuildStyleField({
            ...args,
            dna,
          }),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  server.tool(
    "suggest_keywords",
    "Suggest vibe/DNA keywords for a vibe string, optional genre, and mood list.",
    {
      vibe: z.string().min(1).max(200),
      genre: z.string().max(120).optional(),
      mood: z.array(z.string()).max(8).optional().default([]),
      limit: z.number().int().min(3).max(24).optional().default(12),
    },
    async (args) => {
      try {
        return jsonContent(handleSuggestKeywords(args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  server.tool(
    "analyze_intent",
    "Score clarity of user intent vs Music DNA dimensions and seed library; return missing dimensions and suggestions.",
    {
      intent_text: z.string().min(1).max(4000),
    },
    async (args) => {
      try {
        return jsonContent(handleAnalyzeIntent(args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  server.tool(
    "match_top_patterns",
    "Find similar high-rated pattern cards and library entries for a free-text query.",
    {
      query: z.string().min(1).max(500),
      limit: z.number().int().min(1).max(10).optional().default(3),
    },
    async (args) => {
      try {
        return jsonContent(handleMatchTopPatterns(args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  // ─── Resources ────────────────────────────────────────────────────

  server.resource(
    "library-prompts",
    RESOURCE_URIS.libraryPrompts,
    {
      description:
        "Seed Music DNA prompt library (Neon Horizons, Liminal Tides + schema).",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(getLibraryIndex(), null, 2),
        },
      ],
    }),
  );

  // Per-entry resources (static list from seed)
  for (const entry of listLibraryEntries()) {
    const uri = RESOURCE_URIS.libraryEntry(entry.id);
    server.resource(
      `library-entry-${entry.id}`,
      uri,
      {
        description: `Library entry: ${entry.title}`,
        mimeType: "application/json",
      },
      async (resourceUri) => {
        const found = getLibraryEntry(entry.id);
        return {
          contents: [
            {
              uri: resourceUri.href,
              mimeType: "application/json",
              text: JSON.stringify(found ?? { error: "not_found" }, null, 2),
            },
          ],
        };
      },
    );
  }

  server.resource(
    "musicdna-vocab",
    RESOURCE_URIS.musicDnaVocab,
    {
      description: "Music DNA keyword taxonomy (emotion, genre, textures, etc.).",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(getVocab(), null, 2),
        },
      ],
    }),
  );

  server.resource(
    "musicdna-vibe-maps",
    RESOURCE_URIS.musicDnaVibeMaps,
    {
      description: "Common vibe → partial DNA cards.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(getVibeMaps(), null, 2),
        },
      ],
    }),
  );

  server.resource(
    "musicdna-top-patterns",
    RESOURCE_URIS.musicDnaTopPatterns,
    {
      description: "Top producer / library pattern cards.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(getTopPatterns(), null, 2),
        },
      ],
    }),
  );

  // ─── Prompts ──────────────────────────────────────────────────────

  server.prompt(
    "intent_to_dna",
    "Guided articulation: turn vague creative intent into Music DNA dimensions.",
    {
      raw_intent: z.string().describe("User's raw creative intent"),
    },
    async ({ raw_intent }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "You are the Music DNA coach for Music Superpowers.",
              "Help the user articulate clear intent before generation.",
              "",
              "Raw intent:",
              raw_intent,
              "",
              "Work through these dimensions:",
              "1. Core emotion (1–3 words)",
              "2. Genre or hybrid",
              "3. Textures / instruments",
              "4. Energy map (intro → peak → outro)",
              "5. Vocal persona (or instrumental)",
              "6. Forbidden / exclude styles",
              "",
              "Then call map_music_dna with a refined text summary,",
              "and build_style_field on the resulting DNA.",
              "Compare against library://prompts seed entries.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "emotion_image_to_style",
    "Translate an emotional image description into Style field components.",
    {
      image_description: z
        .string()
        .describe("Description of the image or emotional visual"),
      genre_hint: z.string().optional().describe("Optional genre hint"),
    },
    async ({ image_description, genre_hint }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Convert this emotional image into Music DNA then a Suno Style field.",
              "",
              `Image / emotion: ${image_description}`,
              genre_hint ? `Genre hint: ${genre_hint}` : "",
              "",
              "Steps:",
              "1. Extract 5 keywords + dynamic arc from the image.",
              "2. map_music_dna({ text: <your summary>, genre_hint? })",
              "3. build_style_field({ dna })",
              "4. Quote Style formula: Genre + Mood + Era + Instruments + Vocal + Production + Journey",
              "Phase 1 is text-first — do not download media.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createMusicMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
