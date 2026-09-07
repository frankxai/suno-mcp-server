/**
 * Phase 1 tool handlers — pure functions + zod boundary validation.
 */
import { mapMusicDna } from "../engine/dna-mapper.js";
import { buildStyleField } from "../engine/style-composer.js";
import { suggestKeywords } from "../engine/keyword-suggester.js";
import { analyzeIntent } from "../engine/intent-analyzer.js";
import { matchTopPatterns } from "../engine/pattern-matcher.js";
import {
  MapMusicDnaInputSchema,
  BuildStyleFieldInputSchema,
  SuggestKeywordsInputSchema,
  AnalyzeIntentInputSchema,
  MatchTopPatternsInputSchema,
  type MapMusicDnaInput,
  type BuildStyleFieldInput,
  type SuggestKeywordsInput,
  type AnalyzeIntentInput,
  type MatchTopPatternsInput,
} from "../schemas/music-dna.js";

export function handleMapMusicDna(args: unknown) {
  const input = MapMusicDnaInputSchema.parse(args) as MapMusicDnaInput;
  const dna = mapMusicDna(input);
  return {
    success: true as const,
    dna,
    notes: [
      "Phase 1 text-first mapper (deterministic heuristics + vibe maps).",
      "Refine with agent judgment; image_url is not downloaded.",
      "Feed dna into build_style_field next.",
    ],
  };
}

export function handleBuildStyleField(args: unknown) {
  const input = BuildStyleFieldInputSchema.parse(args) as BuildStyleFieldInput;
  const result = buildStyleField(input);
  return {
    success: true as const,
    ...result,
    notes: [
      "Style formula: Genre + Mood + Era + Instruments + Vocal Persona + Production + Dynamics Journey.",
      "Compare quality against library://prompts (Neon Horizons / Liminal Tides).",
    ],
  };
}

export function handleSuggestKeywords(args: unknown) {
  const input = SuggestKeywordsInputSchema.parse(args) as SuggestKeywordsInput;
  const result = suggestKeywords(input);
  return { success: true as const, ...result };
}

export function handleAnalyzeIntent(args: unknown) {
  const input = AnalyzeIntentInputSchema.parse(args) as AnalyzeIntentInput;
  const result = analyzeIntent(input);
  return { success: true as const, ...result };
}

export function handleMatchTopPatterns(args: unknown) {
  const input = MatchTopPatternsInputSchema.parse(args) as MatchTopPatternsInput;
  const result = matchTopPatterns(input);
  return { success: true as const, ...result };
}

/** Tool metadata for MCP registration (JSON Schema derived from zod via shape docs) */
export const PHASE1_TOOL_DEFS = [
  {
    name: "map_music_dna",
    description:
      "Extract structured Music DNA from free text (and optional image URL as text hint only). Returns core emotion, genre, textures, energy arc, vocal persona, exclude styles, and confidence.",
    // Input schema documented in MapMusicDnaInputSchema
  },
  {
    name: "build_style_field",
    description:
      "Compose a full Suno Custom Style field from a Music DNA object, optionally overriding the dynamics journey. Target quality: seed library (Neon Horizons / Liminal Tides).",
  },
  {
    name: "suggest_keywords",
    description:
      "Suggest vibe/DNA keywords for a vibe string, optional genre, and mood list.",
  },
  {
    name: "analyze_intent",
    description:
      "Score clarity of user intent against Music DNA dimensions and seed library examples; return missing dimensions and suggestions.",
  },
  {
    name: "match_top_patterns",
    description:
      "Find similar high-rated pattern cards and library entries for a free-text query.",
  },
] as const;
