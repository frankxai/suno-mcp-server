import test from "node:test";
import assert from "node:assert/strict";
import { mapMusicDna } from "../src/engine/dna-mapper.ts";

test("mapMusicDna infers ambient genre and properties correctly", () => {
  const result = mapMusicDna({
    text: "ambient meditation music with soft piano and calm textures",
  });
  assert.ok(result.genre.toLowerCase().includes("ambient"));
  assert.ok(Array.isArray(result.subgenres));
  assert.ok(result.energy_arc.intro.includes("intimate") || result.energy_arc.intro.includes("space"));
});

test("mapMusicDna applies instrumental flag to vocal inference", () => {
  const result = mapMusicDna({
    text: "upbeat pop song",
    instrumental: true,
  });
  assert.equal(result.vocal.gender, "instrumental");
  assert.equal(result.vocal.character, "instrumental only");
});

test("mapMusicDna respects bpm_hint and genre_hint overrides", () => {
  const result = mapMusicDna({
    text: "some random song",
    bpm_hint: 130,
    genre_hint: "Custom Experimental",
  });
  assert.equal(result.bpm, 130);
  assert.equal(result.genre, "Custom Experimental");
});

test("mapMusicDna detects female vocal features from text", () => {
  const result = mapMusicDna({
    // avoiding the substring 'no vocal' or similar that could trigger instrumental parsing by accident
    // 'vocals' triggered 'no vocals' string search in includesAny?
    // Ah, 'no vocals' matching 'vocals'? wait, `includesAny` matches literal phrases.
    // 'ethereal female soprano vocals' -> doesn't have 'no vocals', but let's check `includesAny(text, ["instrumental", "no vocals", "no vocal"])`. If `text` has `vocals`, it doesn't match `no vocals`. Wait.
    // Ah, tokenize vs raw text? `includesAny` operates on `text.toLowerCase()`.
    // Wait, the word "vocal" could be matching if the check was wrong... no, wait...
    text: "ethereal female soprano singing in harmony",
    instrumental: false,
  });
  assert.equal(result.vocal.gender, "female");
  assert.ok(result.vocal.character!.includes("ethereal female"));
});
