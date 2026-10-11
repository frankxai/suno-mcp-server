/**
 * Style field composer — Genre + Mood + Era + Instruments + Vocal + Production + Journey
 * Target quality: comparable to Neon Horizons / Liminal Tides seed library.
 */
import {
  type BuildStyleFieldInput,
  type BuildStyleFieldResult,
  BuildStyleFieldResultSchema,
  type MusicDna,
} from "../schemas/music-dna.js";

function joinList(items: string[], max = 6): string {
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
    .join(", ");
}

function vocalPhrase(dna: MusicDna): string {
  if (dna.vocal.gender === "instrumental") {
    return "instrumental only, no vocals";
  }
  const parts: string[] = [];
  if (dna.vocal.character) parts.push(dna.vocal.character);
  else if (dna.vocal.gender !== "unspecified") {
    parts.push(`${dna.vocal.gender} vocals`);
  }
  if (dna.vocal.performance_notes?.length) {
    parts.push(...dna.vocal.performance_notes);
  }
  return parts.length ? joinList(parts, 4) : "expressive lead vocals";
}

function moodPhrase(dna: MusicDna): string {
  const moods = [...new Set([...dna.core_emotion, ...dna.mood])].slice(0, 4);
  if (moods.length >= 2) {
    return `${moods[0]} yet ${moods[1]}${moods[2] ? `, ${moods[2]}` : ""}`;
  }
  return moods[0] ?? "evocative";
}

function journeyPhrase(
  dna: MusicDna,
  journey?: BuildStyleFieldInput["journey"],
): string {
  const intro = journey?.intro ?? dna.energy_arc.intro;
  const build = journey?.build ?? dna.energy_arc.build;
  const peak = journey?.peak ?? dna.energy_arc.peak;
  const bridge = journey?.bridge ?? dna.energy_arc.bridge;
  const outro = journey?.outro ?? dna.energy_arc.outro;

  const chunks = [
    intro,
    build,
    peak,
    bridge ? bridge : null,
    outro,
  ].filter(Boolean) as string[];

  // Prefer quoted journey style used by Liminal Tides seed
  return chunks.join(", ");
}

function softTrim(style: string, max: number): string {
  if (style.length <= max) return style;
  // Prefer cutting at last comma/space before max
  const cut = style.slice(0, max);
  const lastComma = cut.lastIndexOf(",");
  if (lastComma > max * 0.6) return cut.slice(0, lastComma).trim();
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.6) return cut.slice(0, lastSpace).trim();
  return cut.trim();
}

export function buildStyleField(input: BuildStyleFieldInput): BuildStyleFieldResult {
  const { dna, journey, max_chars = 450, include_bpm_key = true, include_exclude = false } =
    input;

  const genre_mood = joinList(
    [dna.genre, moodPhrase(dna), dna.era].filter(Boolean) as string[],
    4,
  );
  const instruments = joinList(dna.textures.length ? dna.textures : ["rich arrangement"], 6);
  const vocal = vocalPhrase(dna);
  const production = joinList(
    dna.production.length ? dna.production : ["high production polish"],
    4,
  );
  const dynamics_journey = journeyPhrase(dna, journey);

  let bpm_key: string | undefined;
  if (include_bpm_key) {
    const bits: string[] = [];
    if (dna.bpm) bits.push(`${dna.bpm} BPM`);
    if (dna.key) bits.push(dna.key);
    if (bits.length) bpm_key = bits.join(", ");
  }

  const ordered = [
    genre_mood,
    instruments,
    vocal,
    production,
    dynamics_journey,
    bpm_key,
  ].filter(Boolean) as string[];

  const quality_notes: string[] = [];
  let style_field = ordered.join(", ");
  if (style_field.length > max_chars) {
    const controls = [vocal, bpm_key].filter(Boolean).join(", ");
    if (controls.length > max_chars) {
      throw new Error(
        `Vocal and tempo/key controls need ${controls.length} characters; increase max_chars or simplify the vocal direction.`,
      );
    }
    const descriptions = [genre_mood, instruments, production, dynamics_journey];
    const descriptionBudget = Math.max(0, max_chars - controls.length - 2);
    const shortened = softTrim(descriptions.join(", "), descriptionBudget);
    style_field = [shortened, controls].filter(Boolean).join(", ");
    const omitted = [
      ["genre/mood", genre_mood],
      ["instruments", instruments],
      ["production", production],
      ["dynamics journey", dynamics_journey],
    ].filter(([, value]) => !shortened.includes(value)).map(([name]) => name);
    quality_notes.push(
      `Shortened descriptions: ${omitted.join(", ")}. Review the brief; vocal and requested tempo/key controls are retained.`,
    );
  }
  if (!dna.textures.length) {
    quality_notes.push("No textures in DNA — Style may feel generic; add instruments.");
  }
  if (dna.vocal.gender === "unspecified") {
    quality_notes.push("Vocal persona unspecified — consider male/female/instrumental.");
  }
  if (!dna.energy_arc.bridge) {
    quality_notes.push("No bridge arc — high-rated seeds often contrast in bridge.");
  }
  if (dna.confidence < 0.5) {
    quality_notes.push("Low DNA confidence — refine intent with analyze_intent.");
  }
  if (style_field.length < 120) {
    quality_notes.push("Style field short — enrich vibe_dna / energy_arc.");
  }

  const exclude_styles = include_exclude ? dna.exclude_styles : dna.exclude_styles;

  return BuildStyleFieldResultSchema.parse({
    style_field,
    char_count: style_field.length,
    components: {
      genre_mood,
      instruments,
      vocal,
      production,
      dynamics_journey,
      bpm_key,
    },
    exclude_styles,
    formula:
      "Genre + Mood + Era + Instruments + Vocal Persona + Production + Dynamics Journey",
    quality_notes,
  });
}
