"use client";

import {
  deleteVocabularyItemService,
  listVocabularyItemsService,
  saveVocabularyItemService,
} from "@/services/vocabulary/vocabulary.service";
import type { ApiResponse } from "@/types/api";
import type {
  DeleteVocabularyInput,
  DeleteVocabularyResponse,
  ListVocabularyResponse,
  SaveVocabularyInput,
  SaveVocabularyResponse,
} from "@/types/vocabulary";

export async function requestSaveVocabularyItem(
  payload: SaveVocabularyInput
): Promise<ApiResponse<SaveVocabularyResponse>> {
  return saveVocabularyItemService(payload);
}

export async function requestListVocabularyItems(): Promise<
  ApiResponse<ListVocabularyResponse>
> {
  return listVocabularyItemsService();
}

export async function requestDeleteVocabularyItem(
  payload: DeleteVocabularyInput
): Promise<ApiResponse<DeleteVocabularyResponse>> {
  return deleteVocabularyItemService(payload);
}
