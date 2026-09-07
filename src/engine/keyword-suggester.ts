/**
 * Keyword suggestions from vocab + vibe maps.
 */
import vocab from "../data/vocab.json" with { type: "json" };
import vibeMaps from "../data/vibe-maps.json" with { type: "json" };
import type { SuggestKeywordsInput } from "../schemas/music-dna.js";

export function suggestKeywords(input: SuggestKeywordsInput): {
  keywords: string[];
  sources: string[];
  vibe_match: string | null;
} {
  const { vibe, genre, mood = [], limit = 12 } = input;
  const text = [vibe, genre ?? "", ...mood].join(" ").toLowerCase();
  const keywords = new Set<string>();
  const sources: string[] = [];
  let vibe_match: string | null = null;

  let bestScore = 0;
  for (const m of vibeMaps.maps) {
    let score = 0;
    if (text.includes(m.vibe.toLowerCase())) score += 5;
    for (const a of m.aliases) {
      if (text.includes(a.toLowerCase())) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      vibe_match = m.vibe;
      for (const k of m.dna_partial.vibe_dna as string[]) keywords.add(k);
      for (const k of m.dna_partial.mood as string[]) keywords.add(k);
      for (const k of (m.dna_partial.textures as string[]) ?? []) keywords.add(k);
    }
  }
  if (vibe_match) sources.push(`vibe-map:${vibe_match}`);

  for (const e of vocab.dimensions.emotion as string[]) {
    if (text.includes(e) || mood.map((m) => m.toLowerCase()).includes(e)) {
      keywords.add(e);
    }
  }

  if (genre) {
    const clusters = vocab.dimensions.genre_clusters as Record<string, string[]>;
    for (const [cluster, subs] of Object.entries(clusters)) {
      if (genre.toLowerCase().includes(cluster)) {
        keywords.add(cluster);
        for (const s of subs.slice(0, 3)) keywords.add(s);
        sources.push(`genre-cluster:${cluster}`);
      }
    }
  }

  if (keywords.size < limit) {
    for (const t of vocab.dimensions.textures as string[]) {
      keywords.add(t);
      if (keywords.size >= limit) break;
    }
    sources.push("vocab:textures");
  }

  return {
    keywords: [...keywords].slice(0, limit),
    sources,
    vibe_match,
  };
}
