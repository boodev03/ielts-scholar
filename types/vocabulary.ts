import { z } from "zod";

// ─── Shared dictionary entry schema (mirrors /api/dictionary response) ────────

export const dictionaryEntrySchema = z.object({
  partOfSpeech: z.string(),
  translation: z.string(),
  meanings: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
});

// ─── Input schemas ────────────────────────────────────────────────────────────

export const saveVocabularySchema = z.object({
  term: z.string().trim().min(1).max(200),
  sourceText: z.string().trim().max(1000).optional(),
  ipa: z.string().trim().max(100).optional(),
  translation: z.string().trim().max(500).optional(),
  entries: z.array(dictionaryEntrySchema).default([]),
  notes: z.array(z.string().trim().max(300)).max(10).default([]),
});

export const deleteVocabularySchema = z.object({
  vocabularyItemId: z.string().uuid(),
});

// ─── Input types ──────────────────────────────────────────────────────────────

export type SaveVocabularyInput = z.infer<typeof saveVocabularySchema>;
export type DeleteVocabularyInput = z.infer<typeof deleteVocabularySchema>;

// ─── Domain types (camelCase for client use) ──────────────────────────────────

export type VocabDictionaryEntry = {
  partOfSpeech: string;
  translation: string;
  meanings: string[];
  examples: string[];
};

export type VocabularyItem = {
  id: string;
  term: string;
  sourceText: string | null;
  ipa: string | null;
  translation: string | null;
  entries: VocabDictionaryEntry[];
  notes: string[];
  createdAt: string;
};

// ─── Response types ───────────────────────────────────────────────────────────

export type SaveVocabularyResponse = {
  vocabularyItem: VocabularyItem;
  /** true = newly added, false = already existed (data updated) */
  created: boolean;
};

export type DeleteVocabularyResponse = {
  deleted: true;
};

export type ListVocabularyResponse = {
  items: VocabularyItem[];
};
