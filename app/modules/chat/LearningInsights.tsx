"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

function CircularProgress({
  value,
  label,
  sublabel,
}: {
  value: number;
  label: string;
  sublabel: string;
}) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--color-surface-container-high)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold leading-none text-[var(--color-on-surface)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {label}
          </span>
          <span className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">
            {sublabel}
          </span>
        </div>
      </div>
    </div>
  );
}

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
        <p className="truncate text-sm font-semibold leading-snug text-[var(--color-on-surface)]">
          {term}
        </p>
        <p className="truncate text-xs leading-snug text-[var(--color-on-surface-variant)]">
          {definition}
        </p>
      </div>
      <Badge className="rounded-full border-0 bg-[var(--color-primary-container)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
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
          className="text-lg font-bold text-[var(--color-on-surface)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Learning Insights
        </h2>
      </div>

      <div className="mx-4 mb-4">
        <Card className="rounded-3xl border-0 bg-[var(--color-surface-container-lowest)] px-4 shadow-[0_12px_40px_rgba(25,28,30,0.04)] ring-0">
          <p className="mb-1 pt-4 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            Daily Goal
          </p>
          <CircularProgress value={68} label="1.2k" sublabel="words" />
          <Progress
            value={68}
            className="mb-4 h-1.5 rounded-full bg-[var(--color-surface-container-high)]"
          />
        </Card>
      </div>

      <div className="mx-4 mb-4">
        <Card className="rounded-3xl border-0 bg-[var(--color-surface-container-lowest)] px-4 pb-2 shadow-[0_12px_40px_rgba(25,28,30,0.04)] ring-0">
          <p className="mb-1 pt-4 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            Current Session
          </p>

          {sessionVocab.length === 0 ? (
            <p className="py-3 text-xs leading-6 text-[var(--color-on-surface-variant)]">
              No words yet. Select a word in chat and click “Add to Flash Card”.
            </p>
          ) : (
            <div className="flex flex-col">
              {sessionVocab.map((item, idx) => (
                <div key={`${item.term}-${idx}`}>
                  {idx > 0 ? (
                    <Separator className="bg-[color:var(--color-outline-variant)]/20" />
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
          <Button className="h-9 w-full rounded-xl bg-[var(--color-surface-container-lowest)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)]">
            Premium now
          </Button>
        </Card>
      </div>
    </aside>
  );
}
