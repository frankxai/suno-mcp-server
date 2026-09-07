/**
 * Phase 1 unit tests — schemas + map_music_dna + build_style_field + library.
 * Run: npm run test:phase1  (after npm install)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapMusicDna } from "../src/engine/dna-mapper.ts";
import { buildStyleField } from "../src/engine/style-composer.ts";
import { analyzeIntent } from "../src/engine/intent-analyzer.ts";
import { matchTopPatterns } from "../src/engine/pattern-matcher.ts";
import {
  listLibraryEntries,
  getLibraryEntry,
  getLibraryIndex,
} from "../src/engine/library.ts";
import {
  MusicDnaSchema,
  MapMusicDnaInputSchema,
  BuildStyleFieldInputSchema,
} from "../src/schemas/music-dna.ts";
import { LibraryEntrySchema } from "../src/schemas/library.ts";

describe("schemas", () => {
  it("rejects empty map_music_dna text", () => {
    assert.throws(() => MapMusicDnaInputSchema.parse({ text: "" }));
  });

  it("parses valid MusicDna", () => {
    const dna = MusicDnaSchema.parse({
      core_emotion: ["nostalgic"],
      genre: "Cinematic synthwave",
      mood: ["energetic", "nostalgic"],
      vibe_dna: ["neon city"],
      energy_arc: {
        intro: "sparse pulse",
        build: "layers leads",
        peak: "soaring chorus",
        outro: "linger pads",
      },
      confidence: 0.7,
    });
    assert.equal(dna.genre, "Cinematic synthwave");
  });
});

describe("map_music_dna", () => {
  it("returns structured DNA for neon / synthwave intent", () => {
    const dna = mapMusicDna({
      text: "Neon night drive through a cyberpunk city, nostalgic 80s synthwave, male baritone, energetic yet wistful",
      instrumental: false,
    });
    assert.ok(dna.core_emotion.length >= 1);
    assert.ok(dna.genre.toLowerCase().includes("synth") || dna.genre.length > 0);
    assert.ok(dna.confidence > 0);
    assert.ok(dna.energy_arc.intro.length > 0);
    MusicDnaSchema.parse(dna);
  });

  it("maps liminal / ocean liquid dnb intent", () => {
    const dna = mapMusicDna({
      text: "Ocean liminal edge, salt air melancholy, Beach House x drum and bass, ethereal female vocals, 174 BPM",
      bpm_hint: 174,
      instrumental: false,
    });
    assert.equal(dna.bpm, 174);
    assert.ok(
      dna.genre.toLowerCase().includes("dnb") ||
        dna.genre.toLowerCase().includes("drum") ||
        dna.vibe_dna.some((v) => /salt|liminal|ocean/i.test(v)),
    );
  });
});

describe("build_style_field", () => {
  it("produces Style comparable in structure to seed quality", () => {
    const dna = mapMusicDna({
      text: "Cinematic synthwave, 80s retro-futuristic, driving arpeggios, lush pads, male baritone with slight rasp, neon horizons",
      bpm_hint: 128,
      instrumental: false,
    });
    const result = buildStyleField(
      BuildStyleFieldInputSchema.parse({ dna, max_chars: 450 }),
    );
    assert.ok(result.style_field.length >= 80);
    assert.ok(result.components.dynamics_journey.length > 0);
    assert.equal(
      result.formula,
      "Genre + Mood + Era + Instruments + Vocal Persona + Production + Dynamics Journey",
    );
    // Soft quality: contains genre-ish and journey-ish material
    assert.ok(/synth|electronic|cinematic|pad|arp|vocal|bpm/i.test(result.style_field));
  });
});

describe("library resource data", () => {
  it("lists seed entries including Neon Horizons and Liminal Tides", () => {
    const index = getLibraryIndex();
    assert.equal(index.entries.length >= 2, true);
    const ids = listLibraryEntries().map((e) => e.id);
    assert.ok(ids.includes("neon-horizons-001"));
    assert.ok(ids.includes("liminal-tides-001"));
    const neon = getLibraryEntry("neon-horizons-001");
    assert.ok(neon);
    LibraryEntrySchema.parse(neon);
    assert.ok(neon!.style_field.includes("synthwave"));
  });
});

describe("analyze_intent + match_top_patterns", () => {
  it("scores incomplete intent lower and suggests dimensions", () => {
    const low = analyzeIntent({ intent_text: "make a song" });
    assert.ok(low.clarity_score < 0.5);
    assert.ok(low.suggestions.length > 0);

    const high = analyzeIntent({
      intent_text:
        "Cinematic synthwave 128 BPM A minor, nostalgic energetic, lush pads and arps, male baritone, starts sparse builds to soaring chorus, 80s retro, exclude generic EDM",
    });
    assert.ok(high.clarity_score >= 0.5);
  });

  it("matches library for neon query", () => {
    const { matches } = matchTopPatterns({ query: "neon synthwave digital nomad", limit: 5 });
    assert.ok(matches.length >= 1);
  });
});
