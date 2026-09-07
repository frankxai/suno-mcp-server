/**
 * Deterministic DNA mapper — text-first Phase 1.
 * Heuristic + seed vibe-maps; no LLM call required (agents can refine upstream).
 */
import vocab from "../data/vocab.json" with { type: "json" };
import vibeMaps from "../data/vibe-maps.json" with { type: "json" };
import {
  type MapMusicDnaInput,
  type MusicDna,
  MusicDnaSchema,
} from "../schemas/music-dna.js";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#&\s./-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function includesAny(hay: string, needles: string[]): boolean {
  const h = hay.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

function scoreVibeMatch(text: string, vibe: string, aliases: string[]): number {
  const corpus = [vibe, ...aliases].map((s) => s.toLowerCase());
  const t = text.toLowerCase();
  let score = 0;
  for (const phrase of corpus) {
    if (t.includes(phrase)) score += phrase.split(/\s+/).length * 2;
    for (const word of phrase.split(/\s+/)) {
      if (word.length > 3 && t.includes(word)) score += 1;
    }
  }
  return score;
}

function pickEmotions(text: string, limit = 3): string[] {
  const emotions = vocab.dimensions.emotion as string[];
  const found = emotions.filter((e) => includesAny(text, [e]));
  if (found.length) return found.slice(0, limit);
  return ["atmospheric", "energetic"].slice(0, limit);
}

function pickTextures(text: string, fromMap: string[] = []): string[] {
  const all = vocab.dimensions.textures as string[];
  const found = all.filter((tex) =>
    includesAny(text, tex.split(/\s+/).filter((w) => w.length > 3)),
  );
  const merged = [...new Set([...fromMap, ...found])];
  return merged.slice(0, 8);
}

function inferGenre(
  text: string,
  hint?: string,
  mapGenre?: string,
): { genre: string; subgenres: string[] } {
  if (hint?.trim()) {
    return { genre: hint.trim(), subgenres: [] };
  }
  if (mapGenre) {
    return { genre: mapGenre, subgenres: [] };
  }
  const clusters = vocab.dimensions.genre_clusters as Record<string, string[]>;
  const t = text.toLowerCase();
  for (const [cluster, subs] of Object.entries(clusters)) {
    if (t.includes(cluster)) {
      const hitSub = subs.find((s) => t.includes(s.toLowerCase()));
      return {
        genre: hitSub ?? cluster,
        subgenres: hitSub ? [cluster] : subs.slice(0, 2),
      };
    }
    for (const sub of subs) {
      if (t.includes(sub.toLowerCase())) {
        return { genre: sub, subgenres: [cluster] };
      }
    }
  }
  if (includesAny(t, ["neon", "synth", "retro", "80s", "outrun"])) {
    return { genre: "Cinematic synthwave", subgenres: ["synthwave"] };
  }
  if (includesAny(t, ["dnb", "drum and bass", "liquid", "breaks"])) {
    return { genre: "Atmospheric liquid DnB", subgenres: ["dnb"] };
  }
  if (includesAny(t, ["ambient", "meditation", "calm", "piano"])) {
    return { genre: "Ambient", subgenres: ["electronic"] };
  }
  return { genre: "Electronic", subgenres: [] };
}

function defaultArc(genre: string, energetic: boolean): MusicDna["energy_arc"] {
  if (genre.toLowerCase().includes("ambient") || genre.toLowerCase().includes("piano")) {
    return {
      intro: "soft sparse tones, intimate space",
      build: "gentle layers of pads and piano",
      peak: "warm emotional crest without aggression",
      bridge: "near-silence with single motif",
      outro: "fade into stillness",
    };
  }
  if (genre.toLowerCase().includes("dnb") || genre.toLowerCase().includes("drum")) {
    return {
      intro: "gentle atmospheric intro with distant breaks",
      build: "builds into powerful liquid DnB drops with soaring pads",
      peak: "emotional vocal peaks over rolling breaks",
      bridge: "strips back to intimate guitar and voice",
      outro: "wave-like dissolve back to atmosphere",
    };
  }
  if (energetic || genre.toLowerCase().includes("synth")) {
    return {
      intro: "starts sparse with pulsing bass",
      build: "layers in bright leads and soaring synths in chorus",
      peak: "full retro-futuristic power with driving arpeggios",
      bridge: "drops to intimate vocal in bridge",
      outro: "resolves with lingering pads and heartbeat bass",
    };
  }
  return {
    intro: "begins intimate and sparse",
    build: "gradually layers instruments and emotion",
    peak: "chorus opens to full power",
    bridge: "strips back to vulnerability",
    outro: "resolves with quiet intensity",
  };
}

function inferVocal(
  text: string,
  instrumental?: boolean,
): MusicDna["vocal"] {
  if (instrumental || includesAny(text, ["instrumental", "no vocals", "no vocal"])) {
    return {
      gender: "instrumental",
      character: "instrumental only",
      performance_notes: [],
    };
  }
  if (includesAny(text, ["female", "ethereal", "soprano"])) {
    return {
      gender: "female",
      character: "ethereal female vocals",
      performance_notes: includesAny(text, ["harmony", "harmonies"])
        ? ["light male harmonies"]
        : [],
    };
  }
  if (includesAny(text, ["male", "baritone", "rasp"])) {
    return {
      gender: "male",
      character: "male baritone with slight rasp",
      performance_notes: [],
    };
  }
  if (includesAny(text, ["mixed", "duet", "harmon"])) {
    return {
      gender: "mixed",
      character: "mixed lead with harmonies",
      performance_notes: ["harmonies"],
    };
  }
  return {
    gender: "unspecified",
    performance_notes: [],
  };
}

export function mapMusicDna(raw: MapMusicDnaInput): MusicDna {
  const textParts = [raw.text];
  if (raw.image_url) {
    textParts.push(`image_ref:${raw.image_url}`);
  }
  const text = textParts.join("\n");
  const tokens = tokenize(text);

  let bestMap: (typeof vibeMaps.maps)[number] | null = null;
  let bestScore = 0;
  for (const m of vibeMaps.maps) {
    const s = scoreVibeMatch(text, m.vibe, m.aliases);
    if (s > bestScore) {
      bestScore = s;
      bestMap = m;
    }
  }

  const partial = bestMap?.dna_partial;
  const { genre, subgenres } = inferGenre(
    text,
    raw.genre_hint,
    partial?.genre as string | undefined,
  );

  const core_emotion =
    (partial?.core_emotion as string[] | undefined)?.length
      ? (partial!.core_emotion as string[])
      : pickEmotions(text);

  const mood =
    (partial?.mood as string[] | undefined)?.length
      ? (partial!.mood as string[])
      : [...new Set([...core_emotion, ...pickEmotions(text, 5)])].slice(0, 6);

  const vibe_dna =
    (partial?.vibe_dna as string[] | undefined)?.length
      ? (partial!.vibe_dna as string[])
      : tokens
          .filter((t) => t.length > 4)
          .slice(0, 8)
          .map((t) => t.replace(/-/g, " "));

  const textures = pickTextures(text, (partial?.textures as string[]) ?? []);
  const energetic = includesAny(text, [
    "energetic",
    "driving",
    "euphoric",
    "peak",
    "power",
  ]);

  const bpm =
    raw.bpm_hint ??
    (typeof partial?.bpm === "number" ? partial.bpm : undefined);

  const key =
    typeof partial?.key === "string" ? partial.key : undefined;

  const era =
    (partial?.era as string | undefined) ??
    ((vocab.dimensions.era as string[]).find((e) => includesAny(text, [e])) ||
      undefined);

  const production = (vocab.dimensions.production as string[]).filter((p) =>
    includesAny(text, p.split(/\s+/).filter((w) => w.length > 4)),
  );
  if (!production.length) {
    production.push("high production polish");
  }

  const exclude_styles = (vocab.dimensions.exclude_common as string[]).filter(
    (ex) => includesAny(text, ["not " + ex, "no " + ex, "exclude " + ex]),
  );

  const vocal = inferVocal(text, raw.instrumental);
  const energy_arc = defaultArc(genre, energetic);

  // Confidence: base + map hit + dimension coverage
  let confidence = 0.35;
  if (bestScore >= 4) confidence += 0.25;
  else if (bestScore >= 2) confidence += 0.12;
  if (raw.genre_hint) confidence += 0.1;
  if (raw.bpm_hint) confidence += 0.05;
  if (textures.length >= 2) confidence += 0.08;
  if (vocal.gender !== "unspecified") confidence += 0.07;
  if (text.length > 80) confidence += 0.08;
  confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

  const dna: MusicDna = {
    core_emotion,
    genre,
    subgenres,
    bpm,
    key,
    mood,
    vibe_dna: vibe_dna.length ? vibe_dna : ["cinematic intent"],
    textures,
    energy_arc,
    vocal,
    era,
    production,
    exclude_styles,
    confidence,
    source_summary: raw.text.slice(0, 280),
  };

  return MusicDnaSchema.parse(dna);
}
