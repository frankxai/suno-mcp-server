import test from "node:test";
import assert from "node:assert/strict";
import { matchTopPatterns } from "../src/engine/pattern-matcher.ts";

test("matches patterns and library entries with high overlap", () => {
  const result = matchTopPatterns({ query: "neon synthwave digital nomad", limit: 5 });
  assert.ok(result.matches.some(m => m.kind === "pattern" || m.kind === "library"));
  assert.ok(result.library_hits.length > 0);
  assert.ok(result.matches.some(m => m.id === "neon-horizons-001"));
});

test("returns empty matches when query has no overlap with corpus", () => {
  const result = matchTopPatterns({ query: "xyzqqq fake unmatchable words", limit: 5 });
  assert.equal(result.matches.length, 0);
  assert.equal(result.library_hits.length, 0);
});

test("respects the limit constraint for matches and library hits", () => {
  const result = matchTopPatterns({ query: "electronic synth", limit: 1 });
  assert.ok(result.matches.length <= 1);
  assert.ok(result.library_hits.length <= 1);
});

test("ranks matches by score in descending order", () => {
  const result = matchTopPatterns({ query: "ambient piano", limit: 10 });
  if (result.matches.length > 1) {
    for (let i = 0; i < result.matches.length - 1; i++) {
      assert.ok(result.matches[i].score >= result.matches[i + 1].score);
    }
  }
});
