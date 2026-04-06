"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider } from "@/components/ui/sidebar";

type PlanItem = {
  id: string;
  title: string;
  description: string;
  focus_area: string;
  task_type: "writing" | "speaking" | "vocabulary" | "grammar" | "mock-test";
  planned_minutes: number;
  status: "pending" | "done";
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

function shortDate(dateKey: string) {
  return new Date(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function StudyPlanScreen() {
  const [payload, setPayload] = useState<StudyPlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const loadPlan = useCallback(async () => {
    const response = await fetch("/api/study-plan");
    const json = (await response.json()) as StudyPlanPayload & { error?: string };
    if (!response.ok) {
      throw new Error(json.error || "Failed to load study plan.");
    }
    setPayload(json);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadPlan();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load study plan.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadPlan]);

  const toggleItem = async (itemId: string, done: boolean) => {
    try {
      setMutating(true);
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-item", itemId, done }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to update task.");
      }
      await loadPlan();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task.");
    } finally {
      setMutating(false);
    }
  };

  const regenerateWeek = async () => {
    try {
      setMutating(true);
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-week" }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to regenerate week." );
      }
      await loadPlan();
      toast.success("Weekly plan regenerated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate week.");
    } finally {
      setMutating(false);
    }
  };

  const weekdayMinutes = useMemo(() => {
    const weekday = payload?.days.filter((day) => day.dayType === "weekday") ?? [];
    if (weekday.length === 0) return 0;
    return Math.round(weekday.reduce((sum, day) => sum + day.targetMinutes, 0) / weekday.length);
  }, [payload]);

  const weekendMinutes = useMemo(() => {
    const weekend = payload?.days.filter((day) => day.dayType === "weekend") ?? [];
    if (weekend.length === 0) return 0;
    return Math.round(weekend.reduce((sum, day) => sum + day.targetMinutes, 0) / weekend.length);
  }, [payload]);

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
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Plan</p>
                  <h1 className="text-3xl font-semibold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
                    Weekly Study Plan
                  </h1>
                  <p className="mt-1 text-sm text-on-surface-variant">Weekdays and weekends are split automatically based on your available time.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => void regenerateWeek()} disabled={mutating}>
                    Regenerate Week
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => void loadPlan()} disabled={loading || mutating}>
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Week Completion</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{payload?.summary.weekCompletionRate ?? 0}%</p>
              </Card>
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Weekday Plan</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{weekdayMinutes} min</p>
              </Card>
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Weekend Plan</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{weekendMinutes} min</p>
              </Card>
              <Card className="rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">Done Minutes</p>
                <p className="mt-1 text-3xl font-semibold text-on-surface">{payload?.summary.doneMinutes ?? 0}/{payload?.summary.totalMinutes ?? 0}</p>
              </Card>
            </div>

            {loading ? (
              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                <p className="text-sm text-on-surface-variant">Loading weekly plan...</p>
              </Card>
            ) : !payload || payload.days.length === 0 ? (
              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                <p className="text-sm text-on-surface-variant">No weekly plan available yet.</p>
              </Card>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                  <p className="mb-3 text-sm font-semibold text-on-surface">Your Week</p>
                  <div className="space-y-4">
                    {payload.days.map((day) => (
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
                                disabled={mutating}
                                onClick={() => void toggleItem(item.id, !done)}
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
                </Card>

                <div className="space-y-5">
                  <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                    <p className="mb-1 text-sm font-semibold text-on-surface">Weakness Assignment</p>
                    <p className="mb-3 text-xs text-on-surface-variant">Tasks are generated from these weak criteria.</p>
                    {!payload.weakCriteria.length ? (
                      <p className="text-sm text-on-surface-variant">No weakness profile yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {payload.weakCriteria.map((criterion) => (
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
                    <p className="mb-1 text-sm font-semibold text-on-surface">Weekly Band Trend</p>
                    <p className="mb-3 text-xs text-on-surface-variant">From your recent attempts.</p>
                    {!payload.weeklyBandTrend.length ? (
                      <p className="text-sm text-on-surface-variant">Complete more attempts to see trend.</p>
                    ) : (
                      <div className="space-y-2">
                        {payload.weeklyBandTrend.map((week) => (
                          <div key={week.weekStart} className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-white px-3 py-2">
                            <p className="text-xs text-on-surface-variant">Week of {shortDate(week.weekStart)}</p>
                            <p className="text-sm font-semibold text-on-surface">{week.avgBand.toFixed(1)} ({week.attempts})</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
