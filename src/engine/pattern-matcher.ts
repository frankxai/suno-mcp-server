/**
 * Match query against top patterns + seed library entries.
 */
import patternsData from "../data/top-patterns.json" with { type: "json" };
import seedLibrary from "../data/seed-library.json" with { type: "json" };
import type { MatchTopPatternsInput } from "../schemas/music-dna.js";
import type { LibraryEntry } from "../schemas/library.js";

export interface PatternMatch {
  kind: "pattern" | "library";
  id: string;
  name: string;
  score: number;
  summary: string;
  template_or_style?: string;
  tags: string[];
  linked_entries?: string[];
}

function scoreText(query: string, corpus: string): number {
  const q = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const c = corpus.toLowerCase();
  let score = 0;
  for (const w of q) {
    if (c.includes(w)) score += w.length > 5 ? 2 : 1;
  }
  if (c.includes(query.toLowerCase().slice(0, 40))) score += 5;
  return score;
}

export function matchTopPatterns(input: MatchTopPatternsInput): {
  matches: PatternMatch[];
  library_hits: LibraryEntry[];
} {
  const { query, limit = 3 } = input;
  const matches: PatternMatch[] = [];

  for (const p of patternsData.patterns) {
    const corpus = [p.name, p.summary, p.template, ...(p.tags ?? [])].join(" ");
    const score = scoreText(query, corpus);
    if (score > 0) {
      matches.push({
        kind: "pattern",
        id: p.id,
        name: p.name,
        score,
        summary: p.summary,
        template_or_style: p.template,
        tags: p.tags ?? [],
        linked_entries: p.linked_entries ?? [],
      });
    }
  }

  const library_hits: LibraryEntry[] = [];
  for (const e of seedLibrary.entries) {
    const corpus = [
      e.title,
      e.genre,
      e.style_field,
      ...(e.mood ?? []),
      ...(e.vibe_dna ?? []),
      ...(e.tags ?? []),
      e.why_it_worked ?? "",
    ].join(" ");
    const score = scoreText(query, corpus);
    if (score > 0) {
      matches.push({
        kind: "library",
        id: e.id,
        name: e.title,
        score,
        summary: e.why_it_worked ?? e.genre,
        template_or_style: e.style_field,
        tags: e.tags ?? [],
      });
      library_hits.push(e as LibraryEntry);
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return {
    matches: matches.slice(0, limit),
    library_hits: library_hits
      .sort((a, b) => {
        const sa = scoreText(
          query,
          [a.title, a.style_field, ...(a.vibe_dna ?? [])].join(" "),
        );
        const sb = scoreText(
          query,
          [b.title, b.style_field, ...(b.vibe_dna ?? [])].join(" "),
        );
        return sb - sa;
      })
      .slice(0, limit),
  };
}
