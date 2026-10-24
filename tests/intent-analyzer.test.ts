import test from "node:test";
import assert from "node:assert/strict";
import { analyzeIntent } from "../src/engine/intent-analyzer.ts";

test("identifies complete dimensions and calculates high clarity score", () => {
  const result = analyzeIntent({
    intent_text: "nostalgic synthwave with lush pads, driving energy build to peak, male baritone vocals, 120 BPM A minor, 80s retro, exclude guitars",
  });
  assert.equal(result.clarity_score, 1);
  assert.equal(result.missing_dimensions.length, 0);
  assert.equal(result.suggestions.length, 0);
  assert.ok(result.strengths.includes("Has emotion"));
  assert.ok(result.strengths.includes("Has genre"));
  assert.ok(result.strengths.includes("Has texture"));
  assert.ok(result.strengths.includes("Has energy arc"));
  assert.ok(result.strengths.includes("Has vocal persona"));
  assert.ok(result.strengths.includes("Has bpm key"));
  assert.ok(result.strengths.includes("Has exclude"));
  assert.ok(result.strengths.includes("Has era"));
});

test("identifies missing dimensions and gives appropriate suggestions", () => {
  const result = analyzeIntent({
    intent_text: "make a song that sounds good",
  });
  assert.equal(result.clarity_score, 0);
  assert.equal(result.missing_dimensions.length, 8);
  assert.equal(result.strengths.length, 0);
  assert.equal(result.suggestions.length, 8);
  assert.ok(result.suggestions.some(s => s.includes("core emotions")));
  assert.ok(result.suggestions.some(s => s.includes("genre")));
});

test("calculates partial clarity score correctly", () => {
  const result = analyzeIntent({
    intent_text: "dreamy ambient piano track with ethereal female vocals",
  });
  // Has emotion (dreamy/ambient), genre (ambient), texture (piano), vocal_persona (female)
  // Dimensions total = 8. Found = 4. Score = 4 / 8 = 0.5.
  assert.equal(result.clarity_score, 0.5);
  assert.ok(result.strengths.includes("Has emotion"));
  assert.ok(result.strengths.includes("Has genre"));
  assert.ok(result.strengths.includes("Has texture"));
  assert.ok(result.strengths.includes("Has vocal persona"));
  assert.equal(result.missing_dimensions.includes("energy_arc"), true);
  assert.equal(result.missing_dimensions.includes("bpm_key"), true);
  assert.equal(result.missing_dimensions.includes("exclude"), true);
  assert.equal(result.missing_dimensions.includes("era"), true);
});

test("matches library ids based on intent text overlap", () => {
  const result = analyzeIntent({
    intent_text: "neon synthwave digital nomad night drive 80s",
  });
  assert.ok(result.comparable_library_ids.length > 0);
  assert.ok(result.comparable_library_ids.includes("neon-horizons-001"));
});
