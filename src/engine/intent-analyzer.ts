/**
 * Intent clarity scoring vs seed library dimensions.
 */
import seedLibrary from "../data/seed-library.json" with { type: "json" };
import type {
  AnalyzeIntentResult,
  AnalyzeIntentInput,
} from "../schemas/music-dna.js";
import { AnalyzeIntentResultSchema } from "../schemas/music-dna.js";

const DIMENSIONS = [
  "emotion",
  "genre",
  "texture",
  "energy_arc",
  "vocal_persona",
  "bpm_key",
  "exclude",
  "era",
] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasEmotion(t: string): boolean {
  return /(nostalg|melanchol|euphor|intimate|energetic|driving|wistful|dark|hope|tense|serene|bittersweet|uplift|dreamy|liminal|atmospher)/i.test(
    t,
  );
}
function hasGenre(t: string): boolean {
  return /(synthwave|dnb|drum\s*&?\s*bass|house|techno|ambient|hip-?hop|rock|pop|jazz|classical|lo-?fi|shoegaze|trap|liquid)/i.test(
    t,
  );
}
function hasTexture(t: string): boolean {
  return /(pad|bass|arp|guitar|piano|synth|break|kick|snare|string|choir|reverb|sub)/i.test(
    t,
  );
}
function hasEnergy(t: string): boolean {
  return /(intro|build|chorus|drop|bridge|outro|sparse|layers|peak|strip|journey|starts|builds)/i.test(
    t,
  );
}
function hasVocal(t: string): boolean {
  return /(vocal|voice|baritone|soprano|female|male|harmony|instrumental|whisper|belt)/i.test(
    t,
  );
}
function hasBpmKey(t: string): boolean {
  return /(\d{2,3}\s*bpm)|(\b[A-G][#b]?\s*(minor|major|min|maj)\b)/i.test(t);
}
function hasExclude(t: string): boolean {
  return /(exclude|not\s+|avoid|no\s+(vocals?|guitar|edm|metal))/i.test(t);
}
function hasEra(t: string): boolean {
  return /(80s|90s|2000s|retro|modern|vintage|futur)/i.test(t);
}

function scoreOverlap(intent: string, entryText: string): number {
  const a = new Set(
    intent
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
  const b = entryText
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  let hit = 0;
  for (const w of b) if (a.has(w)) hit++;
  return hit;
}

export function analyzeIntent(input: AnalyzeIntentInput): AnalyzeIntentResult {
  const t = input.intent_text;
  const present = new Map<Dim, boolean>([
    ["emotion", hasEmotion(t)],
    ["genre", hasGenre(t)],
    ["texture", hasTexture(t)],
    ["energy_arc", hasEnergy(t)],
    ["vocal_persona", hasVocal(t)],
    ["bpm_key", hasBpmKey(t)],
    ["exclude", hasExclude(t)],
    ["era", hasEra(t)],
  ]);

  const presentCount = [...present.values()].filter(Boolean).length;
  const clarity_score = Math.round((presentCount / DIMENSIONS.length) * 100) / 100;

  const missing_dimensions = DIMENSIONS.filter((d) => !present.get(d));

  const strengths: string[] = [];
  for (const [d, ok] of present) {
    if (ok) strengths.push(`Has ${d.replace(/_/g, " ")}`);
  }

  const suggestions: string[] = [];
  if (missing_dimensions.includes("emotion")) {
    suggestions.push("Name 1–3 core emotions (e.g. nostalgic, driving, liminal).");
  }
  if (missing_dimensions.includes("genre")) {
    suggestions.push("Specify genre or hybrid (e.g. Beach House x Drum & Bass).");
  }
  if (missing_dimensions.includes("texture")) {
    suggestions.push("List instruments/textures (pads, arps, rolling breaks, sub bass).");
  }
  if (missing_dimensions.includes("energy_arc")) {
    suggestions.push(
      "Describe journey: starts sparse → layers → peak → intimate bridge → outro.",
    );
  }
  if (missing_dimensions.includes("vocal_persona")) {
    suggestions.push("Specify vocal persona or instrumental only.");
  }
  if (missing_dimensions.includes("bpm_key")) {
    suggestions.push("Add BPM and key if known (e.g. 128 BPM, A minor).");
  }
  if (missing_dimensions.includes("era")) {
    suggestions.push("Add era/production era (80s retro-futuristic, modern polish).");
  }
  if (missing_dimensions.includes("exclude")) {
    suggestions.push("Optional: name styles to exclude (generic EDM drop, novelty).");
  }

  const ranked = seedLibrary.entries
    .map((e) => ({
      id: e.id,
      score: scoreOverlap(
        t,
        [e.title, e.genre, e.style_field, ...(e.vibe_dna ?? []), ...(e.mood ?? [])].join(
          " ",
        ),
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.id);

  return AnalyzeIntentResultSchema.parse({
    clarity_score,
    missing_dimensions,
    strengths,
    suggestions,
    comparable_library_ids: ranked,
  });
}
