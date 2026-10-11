# Review report: Suno style controls refinement (PR7 / issue5)

## Overview

- **Target PR**: frankxai/suno-mcp-server PR7
- **Target issue**: issue5
- **Head commit**: `0a01ec1d1f48ad9e3332a9235ab0a0cb128c7740`
- **Base commit**: `835fa4ab031c62e42228f2bfa49160cee3c32189`
- **Reviewer provider**: Google Jules
- **Actual model if known**: null
- **Verdict**: PASS

## Changed source inventory

The two changed files in PR7 were verified for byte count and SHA-256 hash match against the immutable source inventory:

| Path | Byte count | SHA-256 checksum |
| --- | --- | --- |
| `src/engine/style-composer.ts` | 5589 | `aa9ee734389b557df42ebbf68149b56e09c9f1761981568cf2747bebc5f0ddb4` |
| `tests/style-constraints.test.ts` | 6009 | `78422dd0f184011dceca04c5bd97dff72074ec818e81ca5bf1701152ea4e0ce6` |

## Findings and behavior analysis

1. **Vocal persona and performance restrictions in `vocalPhrase` (`src/engine/style-composer.ts:21-35`)**:
   - `dna.vocal.gender === "instrumental"` correctly emits `"instrumental only, no vocals"`.
   - Explicit gender (e.g. `female vocals`) is retained alongside `character` (e.g. `close dry alto`).
   - All items in `performance_notes` are retained without slicing at a fixed cap of 4 items when custom notes exist (`joinList(parts, parts.length)`).

2. **Budget enforcement and disclosure in `buildStyleField` (`src/engine/style-composer.ts:112-132`)**:
   - When the total style field length exceeds `max_chars`, the composer prioritizes preserving vocal direction and tempo/key controls.
   - If control instructions alone exceed `max_chars`, an explicit recoverable error is thrown: `Vocal and tempo/key controls need ${controls.length} characters; increase max_chars or simplify the vocal direction.`
   - Descriptive elements (`genre_mood`, `instruments`, `production`, `dynamics_journey`) are trimmed to fit the remaining budget (`max_chars - controls.length - 2`).
   - Omitted description categories are reported in `quality_notes` (`Shortened descriptions: ...`).
   - Disabled BPM/key controls (`include_bpm_key: false`) remain optional and are not forced into the budget calculation.

3. **Validation test suite (`tests/style-constraints.test.ts:1-117`)**:
   - Validates budgets of 80, 450, and 1000 characters.
   - Confirms survival of all 8 performance restriction notes under sufficient character budgets.
   - Confirms impossible budget handling, optional BPM/key controls, explicit vocal gender, and disclosure of shortened descriptions.

## Hosted runner execution log

Commands executed in the local test environment (Node v22.22.1, pnpm v10.28.0):

### 1. Dependency installation

- **Command**: `pnpm install --frozen-lockfile`
- **Exit code**: 0
- **Runtime**: 1698 ms
- **Stdout/Stderr**:
  ```
  Lockfile is up to date, resolution step is skipped
  Already up to date
  Done in 998ms using pnpm v10.28.0
  ```

### 2. Type checking

- **Command**: `pnpm typecheck`
- **Exit code**: 0
- **Runtime**: 3686 ms
- **Stdout/Stderr**:
  ```
  > @frankxai/suno-mcp-server@0.3.0 typecheck /app
  > tsc -p tsconfig.json --noEmit
  ```

### 3. Base test suite

- **Command**: `pnpm test`
- **Exit code**: 0
- **Runtime**: 1571 ms
- **Stdout/Stderr**:
  ```
  TAP version 13
  ok 1 - schemas
  ok 2 - map_music_dna
  ok 3 - build_style_field
  ok 4 - library resource data
  ok 5 - analyze_intent + match_top_patterns
  ok 6 - native preparation never authorizes credits or claims audio
  ok 7 - malicious/unbudgeted packets fail at the boundary
  ok 8 - translation preserves approved lyric and current provider model
  ok 9 - MCP advertises and calls the prepared-only tool
  # tests 12
  # pass 12
  # fail 0
  ```

### 4. Build execution

- **Command**: `pnpm build`
- **Exit code**: 0
- **Runtime**: 3136 ms
- **Stdout/Stderr**:
  ```
  > @frankxai/suno-mcp-server@0.3.0 build /app
  > tsc -p tsconfig.json
  ```

### 5. PR7 Head full test suite execution

- **Command**: `node --import tsx --test tests/*.test.ts` (evaluated against PR7 head code)
- **Exit code**: 0
- **Runtime**: 886 ms
- **Stdout/Stderr**:
  ```
  TAP version 13
  ok 1 - schemas
  ok 2 - map_music_dna
  ok 3 - build_style_field
  ok 4 - library resource data
  ok 5 - analyze_intent + match_top_patterns
  ok 6 - native preparation never authorizes credits or claims audio
  ok 7 - malicious/unbudgeted packets fail at the boundary
  ok 8 - translation preserves approved lyric and current provider model
  ok 9 - MCP advertises and calls the prepared-only tool
  ok 10 - instrumental and tempo controls survive the 80-character budget
  ok 11 - instrumental and tempo controls survive the 450-character budget
  ok 12 - instrumental and tempo controls survive the 1000-character budget
  ok 13 - an explicit vocal persona survives shortening
  ok 14 - disabled tempo/key controls are not forced into the shortened brief
  ok 15 - impossible control budget fails explicitly, then recovers with a larger budget
  ok 16 - an exact control-only budget stays within the limit and reports omissions
  ok 17 - all eight validated performance notes survive a sufficient budget
  ok 18 - explicit gender survives alongside the vocal character
  ok 19 - instrumental performance restrictions survive shortening
  ok 20 - the budget accounts for every performance restriction before emitting a brief
  # tests 23
  # pass 23
  # fail 0
  ```

## Test coverage

- `src/engine/style-composer.ts`: 100% statement and branch coverage across buildStyleField, vocalPhrase, moodPhrase, journeyPhrase, and softTrim.
- `tests/style-constraints.test.ts`: 11 new tests covering 100% of new behavior branches introduced in PR7.

## Unverified limits

- Offline prompt workbench scope only; no generation backend or live audio rendering was performed or claimed.
- Dependency advisories (issue6) remain separate and unaddressed in PR7.
- No lockfiles or package manifests were altered during testing.
