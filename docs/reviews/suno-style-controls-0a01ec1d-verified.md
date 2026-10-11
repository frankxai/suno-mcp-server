# Verification review: Suno style controls (exact head 0a01ec1d)

## Summary

- **Verdict:** PASS
- **Repository:** `frankxai/suno-mcp-server`
- **Issue / PR:** Issue #5 / PR #7
- **Exact HEAD:** `0a01ec1d1f48ad9e3332a9235ab0a0cb128c7740`
- **Base commit:** `835fa4ab031c62e42228f2bfa49160cee3c32189`
- **Candidate branch:** `agent/codex/suno-creator-constraints-20261011`
- **Reviewer:** Google Jules (overflow tester)

This verification report provides an independent adversarial review and installed-package proof for exact commit `0a01ec1d1f48ad9e3332a9235ab0a0cb128c7740`. All execution was conducted in isolated temporary directories outside the primary repository checkout using `git archive` extraction and a clean consumer package installation.

---

## Source inventory

The candidate branch diff relative to base commit `835fa4ab` consists of exactly two modified blobs:

| Filepath | Size (bytes) | SHA-256 Checksum |
| :--- | :--- | :--- |
| `src/engine/style-composer.ts` | 5589 | `aa9ee734389b557df42ebbf68149b56e09c9f1761981568cf2747bebc5f0ddb4` |
| `tests/style-constraints.test.ts` | 6009 | `78422dd0f184011dceca04c5bd97dff72074ec818e81ca5bf1701152ea4e0ce6` |

Both files and checksums were verified prior to isolated execution.

---

## Technical review findings

1. **Vocal and instrumental controls:**
   - Instrumental requests (`gender: "instrumental"`) correctly produce `"instrumental only, no vocals"` and append any requested performance notes (e.g. `"instrumental only, no vocals, no choir, no chants"`).
   - Specified genders (e.g. `female`, `male`) combine cleanly with vocal character (e.g. `"female vocals, close dry alto"`).

2. **Performance notes retention:**
   - `vocalPhrase` uses `joinList(parts, parts.length)` to ensure all performance restrictions (e.g. all 8 validated performance notes) are preserved without default truncation.

3. **BPM and key controls:**
   - Requested BPM and key values (e.g. `"92 BPM, D minor"`) are retained as mandatory controls alongside vocal persona directives when descriptions must be shortened to fit budget constraints.
   - When `include_bpm_key` is set to `false`, tempo and key parameters are omitted from the composed style string.

4. **Control budget enforcement and error recovery:**
   - If mandatory vocal and tempo controls alone exceed `max_chars`, `buildStyleField` throws an error detailing the character requirement and guiding the user to increase `max_chars` or simplify vocal directions.
   - Recovering with a larger character budget allows the full style description and control directives to fit and validate successfully.

5. **Descriptive loss disclosure:**
   - When description shortening (`softTrim`) occurs to satisfy character constraints, `quality_notes` explicitly identifies omitted components (e.g. `genre/mood`, `instruments`, `production`, `dynamics journey`).

6. **Schema boundary and MCP tool error handling:**
   - Input and output data structures are validated against Zod schemas (`BuildStyleFieldInputSchema`, `BuildStyleFieldResultSchema`).
   - Tool handlers catch boundary violations and return structured error responses over MCP stdio protocol.

---

## Execution proof (Isolated environment)

### Environment details
- **Extraction path:** `/tmp/suno-mcp-eval-F5kY24` (extracted via `git archive 0a01ec1d1f48ad9e3332a9235ab0a0cb128c7740`)
- **Node.js version:** `v22.22.1`
- **pnpm version:** `10.28.0`
- **OS:** Linux x64

### Command execution summary

1. `pnpm install --frozen-lockfile`
   - Exit code: 0
   - Result: Dependencies resolved cleanly with lockfile up to date.

2. `pnpm typecheck`
   - Exit code: 0
   - Result: TypeScript compilation succeeded with zero errors (`tsc -p tsconfig.json --noEmit`).

3. `pnpm test`
   - Exit code: 0
   - Total tests: 23 pass, 0 fail, 0 skip (11 new tests in `style-constraints.test.ts`, 12 accepted existing tests across `phase1.test.ts` and `session.test.ts`).

4. `pnpm build`
   - Exit code: 0
   - Result: Compiled TypeScript build outputs generated in `dist/`.

5. `npm pack --json`
   - Exit code: 0
   - Package tarball: `frankxai-suno-mcp-server-0.3.0.tgz`
   - SHA-256: `f453e984031cc0b8ff3969c2d9b0bded34979c12d9004c2f35d6f167b840208b`
   - Integrity: `sha512-zjv2+jtX+DVVIxlvcEgKsLcZEaXkuVPhc4DFoVwQe4NNiqrLfsoUOYXx4i1DsmjEpgjnQYFAwoO3x4qTBp0X5Q==`

---

## Consumer package verification

The generated tarball was installed in a fresh, empty consumer directory (`/tmp/suno-mcp-consumer-r6Xj3X`) with `@modelcontextprotocol/sdk@1.32.1`. An official MCP client using `StdioClientTransport` spawned the server (`dist/index.js`) and performed protocol verification:

1. **Tool discovery:** `listTools()` successfully enumerated 6 registered tools, including `build_style_field` and `prepare_music_session`.
2. **Valid tight budget test (`max_chars: 80`):**
   - Output style field: `"Cinematic chamber electronica, instrumental only, no vocals, 92 BPM, D minor"` (76 characters).
   - Confirmed `instrumental only, no vocals` and `92 BPM, D minor` survived shortening.
3. **Impossible budget test (`max_chars: 80` with 160-char mandatory controls):**
   - Correctly returned structured error with `isError: true` and message `"Vocal and tempo/key controls need 160 characters; increase max_chars or simplify the vocal direction."`.
4. **Budget recovery test (`max_chars: 450`):**
   - Succeeded, retaining all performance restrictions (`preserve the original melody`) and requested tempo/key controls (`92 BPM, D minor`).
5. **Clean shutdown:** Client and server disconnected cleanly with no lingering processes.

---

## Qualitative coverage statement

Coverage was assessed qualitatively across all execution paths in `src/engine/style-composer.ts`. Test cases cover vocal gender variations, character descriptions, performance notes arrays up to 8 items, instrumental flags, optional BPM/key parameters, character budget limits, description shortening logic, omission reporting, and boundary error handling. Exact numeric coverage percentages were not artificially generated.

---

## Limits and disclaimers

- **Dependency advisories:** Dependency vulnerability advisories described in issue #6 remain unaddressed in this candidate commit.
- **Platform compatibility:** Verification was performed on Linux x64; Windows host behavior remains unverified.
- **Audio generation and quality:** This repository is an offline prompt workbench and packet compiler. Real audio generation, audio quality, and vendor API integration are outside the scope of this package.
- **Production readiness:** A source PASS verdict verifies implementation correctness against specifications but does not constitute approval for commercial launch or paid API deployment.
