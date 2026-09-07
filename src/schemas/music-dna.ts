/**
 * Music DNA schemas — Phase 1 Prompt Strategy Engine
 *
 * Zod validation notes (production):
 * - Prefer parse() at tool boundaries; never trust LLM-shaped free objects.
 * - Keep DNA fields bounded (max lengths / array sizes) to protect Style field quality.
 * - `image_url` is metadata only in Phase 1 (text-first; no bulk media fetch).
 */
import { z } from "zod";

/** Core emotion / mood token — short natural-language labels */
export const MoodTokenSchema = z
  .string()
  .min(1)
  .max(48)
  .describe("Short mood/emotion token, e.g. nostalgic, driving, liminal");

/** Instrument / texture token */
export const TextureTokenSchema = z
  .string()
  .min(1)
  .max(64)
  .describe("Instrument or production texture, e.g. lush pads, rolling breaks");

/** Energy map: sparse → peak → strip-back (Suno Style journey) */
export const EnergyArcSchema = z.object({
  intro: z
    .string()
    .min(1)
    .max(200)
    .describe("How the track opens (sparse/intimate/pulsing)"),
  build: z
    .string()
    .min(1)
    .max(200)
    .describe("How energy layers into chorus/drop"),
  peak: z
    .string()
    .min(1)
    .max(200)
    .describe("Climax character (soaring, full power, emotional peak)"),
  bridge: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe("Optional bridge / strip-back moment"),
  outro: z
    .string()
    .min(1)
    .max(200)
    .describe("How the track resolves"),
});

export type EnergyArc = z.infer<typeof EnergyArcSchema>;

/** Vocal persona for Style field */
export const VocalPersonaSchema = z.object({
  gender: z
    .enum(["male", "female", "mixed", "instrumental", "unspecified"])
    .default("unspecified"),
  character: z
    .string()
    .max(120)
    .optional()
    .describe("e.g. baritone with slight rasp, ethereal female with light male harmonies"),
  performance_notes: z.array(z.string().max(80)).max(8).default([]),
});

export type VocalPersona = z.infer<typeof VocalPersonaSchema>;

/**
 * Structured Music DNA object — output of map_music_dna
 * Formula: Core emotion + Texture + Energy map + Persona + Forbidden
 */
export const MusicDnaSchema = z.object({
  core_emotion: z.array(MoodTokenSchema).min(1).max(5),
  genre: z.string().min(1).max(120).describe("Primary genre or hybrid label"),
  subgenres: z.array(z.string().max(64)).max(6).default([]),
  bpm: z.number().int().min(40).max(240).optional(),
  key: z.string().max(24).optional().describe("e.g. A minor, F# major"),
  mood: z.array(MoodTokenSchema).min(1).max(8),
  vibe_dna: z
    .array(z.string().min(1).max(64))
    .min(1)
    .max(12)
    .describe("Core vibe keywords (digital nomad, salt air, neon city)"),
  textures: z.array(TextureTokenSchema).max(12).default([]),
  energy_arc: EnergyArcSchema,
  vocal: VocalPersonaSchema.default({
    gender: "unspecified",
    performance_notes: [],
  }),
  era: z.string().max(64).optional().describe("e.g. 80s retro-futuristic, modern liquid"),
  production: z
    .array(z.string().max(80))
    .max(8)
    .default([])
    .describe("Production adjectives: high polish, heavy sub, stereo width"),
  exclude_styles: z
    .array(z.string().max(64))
    .max(12)
    .default([])
    .describe("Suno Exclude Styles — what NOT to sound like"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0–1 confidence that DNA captures user intent"),
  source_summary: z
    .string()
    .max(500)
    .optional()
    .describe("Short restatement of the input intent"),
});

export type MusicDna = z.infer<typeof MusicDnaSchema>;

/** Input for map_music_dna */
export const MapMusicDnaInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(4000)
    .describe("Free-text intent, vibe description, or image caption"),
  image_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Optional image URL — Phase 1 treats as text hint only (no media download)",
    ),
  genre_hint: z.string().max(120).optional(),
  bpm_hint: z.number().int().min(40).max(240).optional(),
  instrumental: z.boolean().optional().default(false),
});

export type MapMusicDnaInput = z.infer<typeof MapMusicDnaInputSchema>;

/** Journey overrides when composing Style from DNA */
export const StyleJourneySchema = z.object({
  intro: z.string().max(200).optional(),
  build: z.string().max(200).optional(),
  peak: z.string().max(200).optional(),
  bridge: z.string().max(200).optional(),
  outro: z.string().max(200).optional(),
});

export type StyleJourney = z.infer<typeof StyleJourneySchema>;

/** Input for build_style_field */
export const BuildStyleFieldInputSchema = z.object({
  dna: MusicDnaSchema.describe("Structured Music DNA from map_music_dna"),
  journey: StyleJourneySchema.optional().describe(
    "Optional overrides for energy journey wording",
  ),
  max_chars: z
    .number()
    .int()
    .min(80)
    .max(1000)
    .default(450)
    .describe("Soft cap for Suno Style field length"),
  include_bpm_key: z.boolean().default(true),
  include_exclude: z
    .boolean()
    .default(false)
    .describe("If true, append exclude notes (client may map to Exclude Styles)"),
});

export type BuildStyleFieldInput = z.infer<typeof BuildStyleFieldInputSchema>;

export const BuildStyleFieldResultSchema = z.object({
  style_field: z.string().min(1).max(1200),
  char_count: z.number().int(),
  components: z.object({
    genre_mood: z.string(),
    instruments: z.string(),
    vocal: z.string(),
    production: z.string(),
    dynamics_journey: z.string(),
    bpm_key: z.string().optional(),
  }),
  exclude_styles: z.array(z.string()).default([]),
  formula:
    z.literal("Genre + Mood + Era + Instruments + Vocal Persona + Production + Dynamics Journey"),
  quality_notes: z.array(z.string()).default([]),
});

export type BuildStyleFieldResult = z.infer<typeof BuildStyleFieldResultSchema>;

/** suggest_keywords */
export const SuggestKeywordsInputSchema = z.object({
  vibe: z.string().min(1).max(200),
  genre: z.string().max(120).optional(),
  mood: z.array(MoodTokenSchema).max(8).default([]),
  limit: z.number().int().min(3).max(24).default(12),
});

export type SuggestKeywordsInput = z.infer<typeof SuggestKeywordsInputSchema>;

/** analyze_intent */
export const AnalyzeIntentInputSchema = z.object({
  intent_text: z.string().min(1).max(4000),
});

export type AnalyzeIntentInput = z.infer<typeof AnalyzeIntentInputSchema>;

export const AnalyzeIntentResultSchema = z.object({
  clarity_score: z.number().min(0).max(1),
  missing_dimensions: z.array(
    z.enum([
      "emotion",
      "genre",
      "texture",
      "energy_arc",
      "vocal_persona",
      "bpm_key",
      "exclude",
      "era",
    ]),
  ),
  strengths: z.array(z.string()),
  suggestions: z.array(z.string()),
  comparable_library_ids: z.array(z.string()).default([]),
});

export type AnalyzeIntentResult = z.infer<typeof AnalyzeIntentResultSchema>;

/** match_top_patterns */
export const MatchTopPatternsInputSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(10).default(3),
});

export type MatchTopPatternsInput = z.infer<typeof MatchTopPatternsInputSchema>;
