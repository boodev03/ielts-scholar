"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

type PlanItem = {
  id: string;
  title: string;
  description: string;
  focus_area: string;
  task_type: "writing" | "speaking" | "vocabulary" | "grammar" | "mock-test";
  weakness_key: string | null;
  weakness_label: string | null;
  planned_minutes: number;
  status: "pending" | "done";
  sort_order: number;
};

type PlanDay = {
  id: string;
  date: string;
  dayLabel: string;
  dayType: "weekday" | "weekend";
  targetMinutes: number;
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
  isMockDay: boolean;
  items: PlanItem[];
};

type WeekBandTrend = {
  weekStart: string;
  avgBand: number;
  attempts: number;
};

type WeakCriterion = {
  key: string;
  label: string;
  avg: number;
  comment: string;
};

type StudyPlanPayload = {
  days: PlanDay[];
  summary: {
    totalItems: number;
    completedItems: number;
    weekCompletionRate: number;
    totalMinutes: number;
    doneMinutes: number;
  };
  weakCriteria: WeakCriterion[];
  weeklyBandTrend: WeekBandTrend[];
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

function shortDate(dateKey: string) {
  return new Date(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressDashboardScreen() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [planMutating, setPlanMutating] = useState(false);

  const loadAttempts = useCallback(async () => {
    const response = await fetch("/api/writing-practice/progress");
    const json = (await response.json()) as { attempts?: Attempt[]; error?: string };
    if (!response.ok) {
      throw new Error(json.error || "Failed to load attempts.");
    }
    setAttempts(json.attempts ?? []);
  }, []);

  const loadStudyPlan = useCallback(async () => {
    const response = await fetch("/api/study-plan");
    const json = (await response.json()) as StudyPlanPayload & { error?: string };
    if (!response.ok) {
      throw new Error(json.error || "Failed to load weekly study plan.");
    }
    setStudyPlan(json);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadAttempts(), loadStudyPlan()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load progress data.");
    } finally {
      setLoading(false);
    }
  }, [loadAttempts, loadStudyPlan]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const togglePlanItem = async (itemId: string, done: boolean) => {
    try {
      setPlanMutating(true);
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-item", itemId, done }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to update task.");
      }
      await loadStudyPlan();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task.");
    } finally {
      setPlanMutating(false);
    }
  };

  const regenerateWeekPlan = async () => {
    try {
      setPlanMutating(true);
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-week" }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to regenerate weekly plan.");
      }
      await loadStudyPlan();
      toast.success("Weekly plan regenerated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate plan.");
    } finally {
      setPlanMutating(false);
    }
  };

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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Progress</p>
                  <h1 className="text-3xl font-semibold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
                    Personal Dashboard
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => void regenerateWeekPlan()} disabled={planMutating}>
                    Regenerate Week
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => void loadData()} disabled={loading || planMutating}>
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Week Completion</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{studyPlan?.summary.weekCompletionRate ?? 0}%</p>
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

            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-on-surface">Weekly Study Plan</p>
                  <p className="text-xs text-on-surface-variant">Weekend time is boosted automatically.</p>
                </div>
                {loading ? (
                  <p className="text-sm text-on-surface-variant">Loading weekly plan...</p>
                ) : !studyPlan || studyPlan.days.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No weekly plan yet.</p>
                ) : (
                  <div className="space-y-4">
                    {studyPlan.days.map((day) => (
                      <div key={day.id} className="rounded-2xl border border-outline-variant/30 bg-white p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-on-surface">
                              {day.dayLabel} • {shortDate(day.date)}
                            </p>
                            <Badge variant="outline" className="border-outline-variant/40 bg-surface-container-low px-2 py-0 text-[10px] uppercase tracking-[0.08em]">
                              {day.dayType}
                            </Badge>
                            {day.isMockDay ? (
                              <Badge className="bg-[#f5a524] text-black hover:bg-[#f5a524]">Mock Day</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            {day.completedMinutes}/{day.plannedMinutes} min ({day.completionRate}%)
                          </p>
                        </div>
                        <Progress value={day.completionRate} className="mb-3 h-2" />
                        <div className="space-y-2">
                          {day.items.map((item) => {
                            const done = item.status === "done";
                            return (
                              <button
                                key={item.id}
                                type="button"
                                disabled={planMutating}
                                onClick={() => void togglePlanItem(item.id, !done)}
                                className="flex w-full items-start gap-3 rounded-xl border border-outline-variant/25 px-3 py-2 text-left transition hover:bg-surface-container-low"
                              >
                                <span className={`mt-[2px] inline-flex h-4 w-4 shrink-0 rounded-sm border ${done ? "border-primary bg-primary" : "border-outline-variant/60"}`} />
                                <span className="min-w-0">
                                  <span className={`block text-sm ${done ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                                    {item.title}
                                  </span>
                                  <span className="block text-xs text-on-surface-variant">
                                    {item.planned_minutes} min • {item.task_type}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="space-y-5">
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
                  <p className="mb-1 text-sm font-semibold text-on-surface">Weekly Band Trend</p>
                  <p className="mb-3 text-xs text-on-surface-variant">Average band by week from your latest attempts.</p>
                  {!studyPlan?.weeklyBandTrend?.length ? (
                    <p className="text-sm text-on-surface-variant">Complete more attempts to see weekly trend.</p>
                  ) : (
                    <div className="space-y-2">
                      {studyPlan.weeklyBandTrend.map((week) => (
                        <div key={week.weekStart} className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-white px-3 py-2">
                          <p className="text-xs text-on-surface-variant">Week of {shortDate(week.weekStart)}</p>
                          <p className="text-sm font-semibold text-on-surface">{week.avgBand.toFixed(1)} ({week.attempts})</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                  <p className="mb-1 text-sm font-semibold text-on-surface">Weakness Assignment</p>
                  <p className="mb-3 text-xs text-on-surface-variant">New tasks are generated from these weakest criteria.</p>
                  {!studyPlan?.weakCriteria?.length ? (
                    <p className="text-sm text-on-surface-variant">No weakness profile available yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {studyPlan.weakCriteria.map((criterion) => (
                        <div key={criterion.key} className="rounded-xl border border-outline-variant/25 bg-white p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-sm font-semibold text-on-surface">{criterion.label}</p>
                            <p className="text-xs text-on-surface-variant">{criterion.avg}%</p>
                          </div>
                          <p className="text-xs text-on-surface-variant">{criterion.comment}</p>
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
