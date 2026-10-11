import test from "node:test";
import assert from "node:assert/strict";
import { buildStyleField } from "../src/engine/style-composer.ts";
import { BuildStyleFieldInputSchema, MusicDnaSchema } from "../src/schemas/music-dna.ts";

const dna = MusicDnaSchema.parse({
  core_emotion: ["hopeful"],
  genre: "Cinematic chamber electronica with analog synthesis and acoustic percussion for an evolving instrumental film cue",
  mood: ["patient", "expansive"],
  vibe_dna: ["night journey"],
  textures: [
    "soft bowed cello with sustained harmonics and gradual crescendos",
    "felt piano arpeggios with spacious warm reverb and natural decay",
    "warm analog pads slowly widening without harsh high frequencies",
    "delicate brushed percussion with restrained low-frequency impact",
    "distant glass harmonics answering the repeating piano motif",
    "acoustic guitar swells around a delicate bowed string motif",
  ],
  vocal: { gender: "instrumental" },
  production: ["warm tape saturation"],
  energy_arc: {
    intro: "quiet piano motif", build: "gradually layer cello and pads",
    peak: "wide instrumental crescendo", bridge: "return to solo piano", outro: "resolve softly",
  },
  bpm: 92, key: "D minor", confidence: 0.9,
});

for (const max_chars of [80, 450, 1000]) {
  test(`instrumental and tempo controls survive the ${max_chars}-character budget`, () => {
    const result = buildStyleField(BuildStyleFieldInputSchema.parse({ dna, max_chars }));
    assert.ok(result.style_field.includes("instrumental only, no vocals"));
    assert.ok(result.style_field.includes("92 BPM, D minor"));
    assert.ok(result.style_field.length <= max_chars);
    assert.equal(result.char_count, result.style_field.length);
    if (max_chars < 1000) {
      assert.ok(result.quality_notes.some(note => note.includes("Shortened descriptions:")));
    } else {
      assert.ok(result.style_field.includes("resolve softly"));
      assert.equal(result.quality_notes.length, 0);
    }
  });
}

test("an explicit vocal persona survives shortening", () => {
  const vocalDna = MusicDnaSchema.parse({ ...dna, vocal: {
    gender: "female", character: "close dry alto", performance_notes: ["no backing choir"],
  } });
  const result = buildStyleField(BuildStyleFieldInputSchema.parse({ dna: vocalDna, max_chars: 80 }));
  assert.ok(result.style_field.includes("close dry alto, no backing choir"));
  assert.ok(result.style_field.includes("92 BPM, D minor"));
});

test("disabled tempo/key controls are not forced into the shortened brief", () => {
  const result = buildStyleField(BuildStyleFieldInputSchema.parse({ dna, max_chars: 80, include_bpm_key: false }));
  assert.ok(result.style_field.includes("instrumental only, no vocals"));
  assert.ok(!result.style_field.includes("92 BPM"));
  assert.equal(result.components.bpm_key, undefined);
});

test("impossible control budget fails explicitly, then recovers with a larger budget", () => {
  const vocalDna = MusicDnaSchema.parse({ ...dna, vocal: {
    gender: "female", character: "intimate expressive alto with breathy verses and powerful sustained chorus notes",
    performance_notes: ["no backing choir", "preserve the original melody"],
  } });
  assert.throws(() => buildStyleField(BuildStyleFieldInputSchema.parse({ dna: vocalDna, max_chars: 80 })), /increase max_chars/);
  const recovered = buildStyleField(BuildStyleFieldInputSchema.parse({ dna: vocalDna, max_chars: 450 }));
  assert.ok(recovered.style_field.includes("preserve the original melody"));
  assert.ok(recovered.style_field.includes("92 BPM, D minor"));
});

test("an exact control-only budget stays within the limit and reports omissions", () => {
  const vocalDna = MusicDnaSchema.parse({ ...dna, vocal: {
    gender: "female", character: "a".repeat(80),
  } });
  const result = buildStyleField(BuildStyleFieldInputSchema.parse({ dna: vocalDna, max_chars: 80, include_bpm_key: false }));
  assert.equal(result.style_field, "a".repeat(80));
  assert.ok(result.quality_notes.some(note => note.includes("genre/mood")));
});
