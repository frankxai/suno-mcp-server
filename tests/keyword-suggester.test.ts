import test from "node:test";
import assert from "node:assert/strict";
import { suggestKeywords } from "../src/engine/keyword-suggester.ts";

test("suggestKeywords provides keywords based on vibe mapping", () => {
  const result = suggestKeywords({ vibe: "neon night drive", limit: 5 });
  assert.equal(result.vibe_match, "neon night drive");
  assert.ok(result.keywords.length > 0);
  assert.ok(result.sources.includes("vibe-map:neon night drive"));
});

test("suggestKeywords falls back to emotions when vibe is missing", () => {
  const result = suggestKeywords({ vibe: "unknown concept", mood: ["energetic", "driving"], limit: 5 });
  assert.ok(result.keywords.includes("energetic"));
  assert.ok(result.keywords.includes("driving"));
  assert.equal(result.vibe_match, null);
});

test("suggestKeywords respects the limit parameter", () => {
  const result = suggestKeywords({ vibe: "neon night drive", limit: 3 });
  assert.equal(result.keywords.length, 3);
});

test("suggestKeywords clusters keywords by genre", () => {
  const result = suggestKeywords({ vibe: "synthwave", genre: "synthwave", limit: 10 });
  assert.ok(result.sources.some(s => s.startsWith("genre-cluster:")));
  assert.ok(result.keywords.includes("synthwave"));
});
