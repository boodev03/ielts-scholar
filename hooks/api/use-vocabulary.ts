"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  requestDeleteVocabularyItem,
  requestListVocabularyItems,
  requestSaveVocabularyItem,
} from "@/requests/vocabulary.request";
import type {
  DeleteVocabularyInput,
  SaveVocabularyInput,
} from "@/types/vocabulary";

export const vocabularyQueryKeys = {
  list: ["vocabulary", "list"] as const,
};

export function useVocabularyListQuery() {
  return useQuery({
    queryKey: vocabularyQueryKeys.list,
    queryFn: requestListVocabularyItems,
  });
}

export function useSaveVocabularyMutation() {
  return useMutation({
    mutationFn: (payload: SaveVocabularyInput) =>
      requestSaveVocabularyItem(payload),
  });
}

export function useDeleteVocabularyMutation() {
  return useMutation({
    mutationFn: (payload: DeleteVocabularyInput) =>
      requestDeleteVocabularyItem(payload),
  });
}
