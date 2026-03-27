"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteVocabularyMutation, useVocabularyListQuery, vocabularyQueryKeys } from "@/hooks/api/use-vocabulary";
import type { VocabularyItem } from "@/types/vocabulary";
import { Trash } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function VocabItemRow({ item, onDelete }: { item: VocabularyItem; onDelete: (id: string) => void }) {
  const primaryEntry = item.entries[0];
  const partOfSpeech = primaryEntry?.partOfSpeech ?? null;
  const firstMeaning = primaryEntry?.meanings[0] ?? item.translation ?? null;

  return (
    <div className="group/row flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold leading-snug text-on-surface">
            {item.term}
          </p>
          {partOfSpeech ? (
            <span className="shrink-0 rounded-full bg-primary-container px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {partOfSpeech}
            </span>
          ) : null}
        </div>
        {item.ipa ? (
          <p className="text-[11px] leading-4 text-on-surface-variant/70">{item.ipa}</p>
        ) : null}
        {firstMeaning ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-on-surface-variant">
            {firstMeaning}
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 rounded-md opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-red-50 hover:text-red-500"
        onClick={() => onDelete(item.id)}
      >
        <Trash size={12} weight="bold" />
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function LearningInsights() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useVocabularyListQuery();
  const deleteMutation = useDeleteVocabularyMutation();

  const items = data?.success ? data.data.items : [];

  const handleDelete = async (vocabularyItemId: string) => {
    const result = await deleteMutation.mutateAsync({ vocabularyItemId });
    if (!result.success) {
      toast.error("Failed to delete word.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.list });
    toast.success("Word removed from flashcards.");
  };

  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col gap-0 overflow-y-auto"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="px-5 pb-3 pt-5">
        <h2
          className="text-lg font-bold text-on-surface"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Learning Insights
        </h2>
      </div>

      <div className="mx-4 mb-4">
        <Card className="rounded-3xl border-0 bg-surface-container-lowest px-4 pb-2 shadow-[0_12px_40px_rgba(25,28,30,0.04)] ring-0">
          <p className="mb-1 pt-4 text-xs font-semibold text-on-surface-variant">
            My Vocabulary
          </p>

          {isLoading ? (
            <LoadingSkeleton />
          ) : items.length === 0 ? (
            <p className="py-3 text-xs leading-6 text-on-surface-variant">
              No words yet. Select a word in chat and click the ★ to save it.
            </p>
          ) : (
            <div className="flex flex-col">
              {items.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 ? (
                    <Separator className="bg-outline-variant/20" />
                  ) : null}
                  <VocabItemRow
                    item={item}
                    onDelete={(id) => void handleDelete(id)}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mx-4 mb-6">
        <Card className="rounded-3xl border-0 bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-fixed-variant))] px-5 py-5 text-white shadow-none ring-0">
          <p className="mb-1 text-sm font-bold leading-snug">Ready for the Exam?</p>
          <p className="mb-4 text-xs leading-6 text-white/70">
            Upscaled your exam realisation to premium academic feel.
          </p>
          <Button className="h-9 w-full rounded-xl bg-surface-container-lowest text-sm font-semibold text-primary hover:bg-surface-container-low">
            Premium now
          </Button>
        </Card>
      </div>
    </aside>
  );
}
