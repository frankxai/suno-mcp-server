/**
 * Prompt library loaders for MCP resources.
 */
import seedLibrary from "../data/seed-library.json" with { type: "json" };
import vocab from "../data/vocab.json" with { type: "json" };
import vibeMaps from "../data/vibe-maps.json" with { type: "json" };
import topPatterns from "../data/top-patterns.json" with { type: "json" };
import {
  LibraryEntrySchema,
  LibraryIndexSchema,
  type LibraryEntry,
  type LibraryIndex,
} from "../schemas/library.js";

export function getLibraryIndex(): LibraryIndex {
  return LibraryIndexSchema.parse(seedLibrary);
}

export function listLibraryEntries(): LibraryEntry[] {
  return getLibraryIndex().entries.map((e) => LibraryEntrySchema.parse(e));
}

export function getLibraryEntry(id: string): LibraryEntry | undefined {
  return listLibraryEntries().find((e) => e.id === id);
}

export function getVocab() {
  return vocab;
}

export function getVibeMaps() {
  return vibeMaps;
}

export function getTopPatterns() {
  return topPatterns;
}

/** Resource URI helpers */
export const RESOURCE_URIS = {
  libraryPrompts: "library://prompts",
  libraryEntry: (id: string) => `library://prompts/${id}`,
  musicDnaVocab: "musicdna://vocab",
  musicDnaVibeMaps: "musicdna://vibe-maps",
  musicDnaTopPatterns: "musicdna://top-patterns",
} as const;
