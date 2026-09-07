/**
 * Prompt library entry schema — MCP Resource library://prompts
 * Aligns with starlight/music-ecosystem/prompt-library/SEED_PROMPT_LIBRARY.md
 */
import { z } from "zod";

export const LibraryEntrySchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  artist: z.string().max(160).default("Unknown"),
  genre: z.string().min(1).max(160),
  bpm: z.number().int().min(40).max(240).optional(),
  key: z.string().max(24).optional(),
  mood: z.array(z.string().max(48)).default([]),
  vibe_dna: z.array(z.string().max(64)).default([]),
  style_field: z.string().min(1).max(2000),
  lyrics_excerpt: z.string().max(4000).optional(),
  success_signals: z.array(z.string().max(200)).default([]),
  why_it_worked: z.string().max(1000).optional(),
  tags: z.array(z.string().max(48)).default([]),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  variants: z.array(z.string()).default([]),
  linked_release: z.string().max(500).optional(),
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

export const LibraryIndexSchema = z.object({
  version: z.string(),
  updated: z.string(),
  entries: z.array(LibraryEntrySchema),
});

export type LibraryIndex = z.infer<typeof LibraryIndexSchema>;
