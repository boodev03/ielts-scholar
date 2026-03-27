"use client";

import type { CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  useDeleteVocabularyMutation,
  useVocabularyListQuery,
  vocabularyQueryKeys,
} from "@/hooks/api/use-vocabulary";
import type { VocabularyItem } from "@/types/vocabulary";

// ─── Vocabulary card ──────────────────────────────────────────────────────────

function VocabularyCard({
  item,
  onDelete,
}: {
  item: VocabularyItem;
  onDelete: (id: string) => void;
}) {
  const allPartsOfSpeech = [
    ...new Set(item.entries.map((e) => e.partOfSpeech).filter(Boolean)),
  ];

  return (
    <Card className="group/card relative rounded-2xl border-0 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(25,28,30,0.05)] ring-0 transition-shadow hover:shadow-[0_8px_28px_rgba(25,28,30,0.09)]">
      {/* Delete button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="absolute right-3 top-3 size-7 rounded-lg opacity-0 transition-opacity group-hover/card:opacity-100 hover:bg-red-50 hover:text-red-500"
      >
        <Trash size={14} weight="bold" />
      </Button>

      {/* Term + IPA */}
      <div className="mb-3 pr-6">
        <p
          className="text-2xl font-bold leading-tight text-on-surface"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {item.term}
        </p>
        {item.ipa ? (
          <p className="mt-0.5 text-sm text-on-surface-variant">{item.ipa}</p>
        ) : null}
      </div>

      {/* Part of speech badges */}
      {allPartsOfSpeech.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {allPartsOfSpeech.map((pos) => (
            <span
              key={pos}
              className="rounded-full bg-primary-container px-2.5 py-0.5 text-[11px] font-semibold text-primary"
            >
              {pos}
            </span>
          ))}
        </div>
      ) : null}

      {/* Global translation */}
      {item.translation ? (
        <p className="mb-3 text-sm font-medium text-on-surface">
          {item.translation}
        </p>
      ) : null}

      {/* Entries: meanings + examples */}
      {item.entries.length > 0 ? (
        <div className="space-y-3">
          {item.entries.map((entry, idx) => (
            <div key={idx}>
              {entry.meanings.length > 0 ? (
                <ul className="space-y-0.5">
                  {entry.meanings.map((meaning, mIdx) => (
                    <li
                      key={mIdx}
                      className="flex gap-2 text-sm leading-6 text-on-surface-variant"
                    >
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-on-surface-variant/40" />
                      {meaning}
                    </li>
                  ))}
                </ul>
              ) : null}
              {entry.examples.length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {entry.examples.map((ex, eIdx) => (
                    <p
                      key={eIdx}
                      className="rounded-lg bg-surface-container-low px-3 py-1.5 text-[13px] italic leading-6 text-on-surface-variant"
                    >
                      &ldquo;{ex}&rdquo;
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Usage notes */}
      {item.notes.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-outline-variant/20 pt-3">
          {item.notes.map((note, idx) => (
            <p key={idx} className="text-xs leading-5 text-on-surface-variant">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(25,28,30,0.05)] ring-0">
      <Skeleton className="mb-3 h-8 w-36" />
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="mb-1.5 h-3 w-full" />
      <Skeleton className="mb-1.5 h-3 w-5/6" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p
        className="text-2xl font-semibold text-on-surface-variant"
        style={{ fontFamily: "var(--font-display)" }}
      >
        No vocabulary saved yet
      </p>
      <p className="max-w-xs text-sm leading-6 text-on-surface-variant">
        Go to a chat, select any word or phrase, and click the ★ icon to save it
        here with full dictionary data.
      </p>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function VocabularyContent() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useVocabularyListQuery();
  const deleteMutation = useDeleteVocabularyMutation();

  const items: VocabularyItem[] = data?.success ? data.data.items : [];

  const handleDelete = async (vocabularyItemId: string) => {
    const result = await deleteMutation.mutateAsync({ vocabularyItemId });
    if (!result.success) {
      toast.error("Failed to delete word.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.list });
    toast.success("Word removed.");
  };

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-8 pb-4 pt-7">
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-on-surface"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My Vocabulary
            </h1>
            {!isLoading && items.length > 0 ? (
              <p className="mt-1 text-sm text-on-surface-variant">
                {items.length} {items.length === 1 ? "word" : "words"} saved
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <VocabularyCard
                key={item.id}
                item={item}
                onDelete={(id) => void handleDelete(id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Screen wrapper (sidebar + content) ───────────────────────────────────────

export default function VocabularyScreen() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
          "--sidebar-width-icon": "64px",
        } as CSSProperties
      }
      className="h-full"
    >
      <div
        className="flex h-full flex-1 overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <Sidebar />
        <VocabularyContent />
      </div>
    </SidebarProvider>
  );
}
