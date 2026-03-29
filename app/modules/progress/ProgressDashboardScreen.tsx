"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/app/layouts/Sidebar";

type CriterionScore = {
  key: string;
  label: string;
  score: number;
  weight: number;
  comment: string;
};

type Attempt = {
  id: string;
  exercise_mode: "sentence-translation" | "topic-writing" | "speaking-live";
  overall_accuracy: number;
  band_score: number;
  criterion_scores: CriterionScore[];
  created_at: string;
};

function toDateKey(input: string) {
  const date = new Date(input);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function modeLabel(mode: Attempt["exercise_mode"]) {
  if (mode === "sentence-translation") return "Sentence Translation";
  if (mode === "topic-writing") return "Topic Writing";
  return "Speaking Live";
}

export default function ProgressDashboardScreen() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/writing-practice/progress");
      const json = (await response.json()) as { attempts?: Attempt[] };
      if (!response.ok) return;
      setAttempts(json.attempts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const recent = useMemo(() => attempts.slice(0, 20), [attempts]);

  const estimatedBand = useMemo(() => {
    if (recent.length === 0) return null;
    const avg = recent.reduce((sum, item) => sum + item.band_score, 0) / recent.length;
    return Number(avg.toFixed(1));
  }, [recent]);

  const streak = useMemo(() => {
    if (attempts.length === 0) return 0;
    const days = new Set(attempts.map((item) => toDateKey(item.created_at)));
    const cursor = new Date();
    let count = 0;
    while (true) {
      const key = toDateKey(cursor.toISOString());
      if (!days.has(key)) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [attempts]);

  const criterionAverages = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const item of recent) {
      for (const criterion of item.criterion_scores ?? []) {
        const current = map.get(criterion.key) ?? {
          label: criterion.label,
          total: 0,
          count: 0,
        };
        current.total += criterion.score;
        current.count += 1;
        map.set(criterion.key, current);
      }
    }
    return [...map.entries()]
      .map(([key, value]) => ({
        key,
        label: value.label,
        avg: Math.round(value.total / value.count),
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [recent]);

  const mistakeNotebook = useMemo(() => {
    const notes = new Map<string, { label: string; notes: string[] }>();
    for (const item of recent) {
      const weak = [...(item.criterion_scores ?? [])].sort((a, b) => a.score - b.score).slice(0, 2);
      for (const criterion of weak) {
        const existing = notes.get(criterion.key) ?? { label: criterion.label, notes: [] };
        if (criterion.comment && !existing.notes.includes(criterion.comment)) {
          existing.notes.push(criterion.comment);
        }
        notes.set(criterion.key, existing);
      }
    }
    return [...notes.entries()].map(([key, value]) => ({
      key,
      label: value.label,
      drills: value.notes.slice(0, 3),
    }));
  }, [recent]);

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
      <div className="flex h-full flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar />
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-5">
            <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Progress</p>
                  <h1 className="text-3xl font-semibold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
                    Personal Dashboard
                  </h1>
                </div>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => void loadData()}>
                  Refresh
                </Button>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Estimated Band</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{estimatedBand ?? "--"}</p>
              </Card>
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Streak</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{streak} days</p>
              </Card>
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Total Attempts</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{attempts.length}</p>
              </Card>
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Modes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["sentence-translation", "topic-writing", "speaking-live"].map((mode) => (
                    <Badge key={mode} variant="outline" className="border-outline-variant/40 bg-white">
                      {modeLabel(mode as Attempt["exercise_mode"])}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                <p className="mb-3 text-sm font-semibold text-on-surface">Criterion Trend</p>
                {loading ? (
                  <p className="text-sm text-on-surface-variant">Loading...</p>
                ) : criterionAverages.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No attempts yet.</p>
                ) : (
                  <div className="space-y-3">
                    {criterionAverages.map((item) => (
                      <div key={item.key}>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-medium text-on-surface">{item.label}</p>
                          <p className="text-xs text-on-surface-variant">{item.avg}%</p>
                        </div>
                        <Progress value={item.avg} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                <p className="mb-1 text-sm font-semibold text-on-surface">Mistake Notebook</p>
                <p className="mb-3 text-xs text-on-surface-variant">Auto-generated from your weakest criteria.</p>
                {mistakeNotebook.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Complete more practice to build notebook entries.</p>
                ) : (
                  <div className="space-y-3">
                    {mistakeNotebook.map((entry) => (
                      <div key={entry.key} className="rounded-xl border border-outline-variant/30 bg-white p-3">
                        <p className="text-sm font-semibold text-on-surface">{entry.label}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-on-surface-variant">
                          {entry.drills.map((drill) => (
                            <li key={drill}>{drill}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
