"use server";

import { createClient } from "@/lib/supabase/server";
import {
  apiFailure,
  apiSuccess,
  type ApiErrorCode,
  type ApiResponse,
} from "@/types/api";
import {
  saveVocabularySchema,
  deleteVocabularySchema,
  type VocabularyItem,
  type SaveVocabularyResponse,
  type DeleteVocabularyResponse,
  type ListVocabularyResponse,
} from "@/types/vocabulary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSupabaseError(status?: number): ApiErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return "SUPABASE_ERROR";
}

async function getAuthedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, userId: null as string | null };
  return { supabase, userId: user.id };
}

type VocabRow = {
  id: string;
  term: string;
  source_text: string | null;
  ipa: string | null;
  translation: string | null;
  entries: Array<{
    partOfSpeech: string;
    translation: string;
    meanings: string[];
    examples: string[];
  }>;
  notes: string[];
  created_at: string;
};

function toVocabularyItem(row: VocabRow): VocabularyItem {
  return {
    id: row.id,
    term: row.term,
    sourceText: row.source_text,
    ipa: row.ipa,
    translation: row.translation,
    entries: row.entries ?? [],
    notes: row.notes ?? [],
    createdAt: row.created_at,
  };
}

/** Build the front side of a flashcard: term + IPA if available. */
function buildFrontText(term: string, ipa: string | undefined | null): string {
  return ipa ? `${term}\n${ipa}` : term;
}

/** Build the back side of a flashcard from the richest available data. */
function buildBackText(
  termFallback: string,
  translation: string | undefined | null,
  entries: Array<{
    partOfSpeech: string;
    translation: string;
    meanings: string[];
    examples: string[];
  }>
): string {
  const parts: string[] = [];

  if (translation) parts.push(translation);

  for (const entry of entries.slice(0, 2)) {
    const meanings = entry.meanings.slice(0, 2).join("; ");
    if (meanings) parts.push(`[${entry.partOfSpeech}] ${meanings}`);
    if (entry.examples[0]) parts.push(`e.g. ${entry.examples[0]}`);
  }

  return parts.join("\n") || termFallback;
}

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * Save (create or update) a vocabulary item and ensure a linked flashcard exists.
 *
 * - If the term already exists for this user → update rich fields, return created=false.
 * - If the term is new → insert item + create flashcard, return created=true.
 */
export async function saveVocabularyItemService(
  rawInput: unknown
): Promise<ApiResponse<SaveVocabularyResponse>> {
  const parsed = saveVocabularySchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid vocabulary payload.",
      parsed.error.flatten()
    );
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) return apiFailure("UNAUTHORIZED", "You must be logged in.");

  const { term, sourceText, ipa, translation, entries, notes } = parsed.data;

  const SELECT_COLS =
    "id, term, source_text, ipa, translation, entries, notes, created_at";

  // ── 1. Check for an existing item (case-insensitive term match) ────────────
  const { data: existing, error: findError } = await supabase
    .from("vocabulary_items")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .ilike("term", term)
    .maybeSingle<VocabRow>();

  if (findError) {
    return apiFailure(mapSupabaseError(), findError.message);
  }

  let vocabItem: VocabRow;
  let created: boolean;

  if (existing) {
    // ── 2a. Update existing with latest rich data ────────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from("vocabulary_items")
      .update({
        source_text: sourceText ?? existing.source_text,
        ipa: ipa ?? existing.ipa,
        translation: translation ?? existing.translation,
        entries: entries.length ? entries : existing.entries,
        notes: notes.length ? notes : existing.notes,
      })
      .eq("id", existing.id)
      .select(SELECT_COLS)
      .single<VocabRow>();

    if (updateError) {
      return apiFailure(mapSupabaseError(), updateError.message);
    }

    vocabItem = updated;
    created = false;
  } else {
    // ── 2b. Insert new vocabulary item ───────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from("vocabulary_items")
      .insert({
        user_id: userId,
        term,
        source_text: sourceText ?? null,
        ipa: ipa ?? null,
        translation: translation ?? null,
        entries,
        notes,
        metadata: {},
      })
      .select(SELECT_COLS)
      .single<VocabRow>();

    if (insertError) {
      return apiFailure(mapSupabaseError(), insertError.message);
    }

    vocabItem = inserted;
    created = true;

    // ── 3. Create a linked flashcard (only for new vocabulary items) ─────────
    const front = buildFrontText(term, ipa);
    const back = buildBackText(term, translation, entries);

    await supabase.from("flashcards").insert({
      user_id: userId,
      vocabulary_item_id: vocabItem.id,
      front_text: front,
      back_text: back,
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      next_review_at: new Date().toISOString(),
    });
  }

  return apiSuccess({ vocabularyItem: toVocabularyItem(vocabItem), created });
}

/**
 * List the most recent vocabulary items for the current user.
 */
export async function listVocabularyItemsService(): Promise<
  ApiResponse<ListVocabularyResponse>
> {
  const { supabase, userId } = await getAuthedUserId();
  if (!userId) return apiFailure("UNAUTHORIZED", "You must be logged in.");

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select(
      "id, term, source_text, ipa, translation, entries, notes, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<VocabRow[]>();

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ items: (data ?? []).map(toVocabularyItem) });
}

/**
 * Delete a vocabulary item (cascades to its linked flashcard via ON DELETE SET NULL,
 * but the flashcard itself is NOT deleted — the user keeps their SRS history).
 */
export async function deleteVocabularyItemService(
  rawInput: unknown
): Promise<ApiResponse<DeleteVocabularyResponse>> {
  const parsed = deleteVocabularySchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid delete payload.",
      parsed.error.flatten()
    );
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) return apiFailure("UNAUTHORIZED", "You must be logged in.");

  const { error } = await supabase
    .from("vocabulary_items")
    .delete()
    .eq("id", parsed.data.vocabularyItemId)
    .eq("user_id", userId);

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ deleted: true as const });
}
