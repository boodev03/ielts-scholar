"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function VocabItem({
  term,
  definition,
  band,
}: {
  term: string;
  definition: string;
  band: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-snug text-on-surface">
          {term}
        </p>
        <p className="truncate text-xs leading-snug text-on-surface-variant">
          {definition}
        </p>
      </div>
      <Badge className="rounded-full border-0 bg-primary-container px-2 py-0.5 text-[10px] font-bold text-primary">
        {band}
      </Badge>
    </div>
  );
}

export default function LearningInsights({
  flashcardWords,
}: {
  flashcardWords: string[];
}) {
  const sessionVocab = flashcardWords.map((word) => ({
    term: word,
    definition: "Saved from chat selection",
    band: "Saved",
  }));

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
            Current Session
          </p>

          {sessionVocab.length === 0 ? (
            <p className="py-3 text-xs leading-6 text-on-surface-variant">
              No words yet. Select a word in chat and click “Add to Flash Card”.
            </p>
          ) : (
            <div className="flex flex-col">
              {sessionVocab.map((item, idx) => (
                <div key={`${item.term}-${idx}`}>
                  {idx > 0 ? (
                    <Separator className="bg-outline-variant/20" />
                  ) : null}
                  <VocabItem {...item} />
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
