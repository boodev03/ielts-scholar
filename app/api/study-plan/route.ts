import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type WeakCriterion = {
  key: string;
  label: string;
  avg: number;
  comment: string;
};

type PlanDayRow = {
  id: string;
  plan_date: string;
  day_type: "weekday" | "weekend";
  target_minutes: number;
  is_mock_day: boolean;
};

type PlanItemRow = {
  id: string;
  plan_day_id: string;
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

type WritingAttemptRow = {
  band_score: number;
  created_at: string;
  criterion_scores: Array<{
    key: string;
    label: string;
    score: number;
    comment: string;
  }>;
};

type UserProfileRow = {
  study_minutes_per_day: number | null;
  target_band: number | null;
  focus_skills: string[] | null;
};

const toggleItemSchema = z.object({
  action: z.literal("toggle-item"),
  itemId: z.uuid(),
  done: z.boolean(),
});

const regenerateSchema = z.object({
  action: z.literal("regenerate-week"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map((v) => Number(v));
  return new Date(y, (m || 1) - 1, d || 1);
}

function getWeekStartMonday(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDateKeys(startDate?: string) {
  const monday = startDate ? getWeekStartMonday(fromDateKey(startDate)) : getWeekStartMonday(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateKey(date);
  });
}

function weekdayLabel(dateKey: string) {
  return fromDateKey(dateKey).toLocaleDateString("en-US", { weekday: "short" });
}

function criterionTaskType(key: string): PlanItemRow["task_type"] {
  if (key.includes("pronunciation") || key.includes("fluency") || key.includes("coherence")) {
    return "speaking";
  }
  if (key.includes("lexical") || key.includes("vocabulary")) {
    return "vocabulary";
  }
  if (key.includes("grammar")) {
    return "grammar";
  }
  return "writing";
}

function buildTaskTitle(criterion: WeakCriterion, index: number, isWeekend: boolean) {
  const prefix = isWeekend ? "Deep Drill" : "Focused Drill";
  return `${prefix} ${index + 1}: ${criterion.label}`;
}

function buildTaskDescription(criterion: WeakCriterion, targetBand: number | null) {
  const band = targetBand ? ` toward band ${targetBand}` : "";
  return `${criterion.comment || "Practice this criterion with short corrections and one retry."}${band}.`;
}

function buildMockTask(targetMinutes: number) {
  const plannedMinutes = Math.max(45, Math.min(120, Math.round(targetMinutes * 0.65)));
  return {
    title: "Timed Mock Session",
    description: "Run one full timed IELTS block this weekend and review your report afterward.",
    focus_area: "Mock Test",
    task_type: "mock-test" as const,
    weakness_key: null,
    weakness_label: null,
    planned_minutes: plannedMinutes,
    sort_order: 99,
  };
}

async function getAuthedContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function getWeakCriteria(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("writing_practice_attempts")
    .select("band_score, created_at, criterion_scores")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<WritingAttemptRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const bucket = new Map<string, { label: string; total: number; count: number; comments: string[] }>();

  for (const attempt of data ?? []) {
    for (const criterion of attempt.criterion_scores ?? []) {
      const current = bucket.get(criterion.key) ?? {
        label: criterion.label,
        total: 0,
        count: 0,
        comments: [],
      };
      current.total += criterion.score;
      current.count += 1;
      if (criterion.comment && !current.comments.includes(criterion.comment)) {
        current.comments.push(criterion.comment);
      }
      bucket.set(criterion.key, current);
    }
  }

  const weak = [...bucket.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      avg: Math.round(value.total / value.count),
      comment: value.comments[0] ?? "Practice with one correction + one retry.",
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);

  if (weak.length > 0) return weak;

  return [
    { key: "grammar_control", label: "Grammar Control", avg: 50, comment: "Fix sentence structure and verb forms." },
    { key: "lexical_resource", label: "Lexical Resource", avg: 50, comment: "Use topic vocabulary in short answers." },
    { key: "fluency_coherence", label: "Fluency & Coherence", avg: 50, comment: "Speak smoothly with simple linking phrases." },
  ] satisfies WeakCriterion[];
}

async function getProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserProfileRow> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("study_minutes_per_day, target_band, focus_skills")
    .eq("id", userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    study_minutes_per_day: data?.study_minutes_per_day ?? 60,
    target_band: data?.target_band ?? null,
    focus_skills: data?.focus_skills ?? [],
  };
}

async function ensureWeekPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options?: { startDate?: string; forceRegenerate?: boolean }
) {
  const weekDates = getWeekDateKeys(options?.startDate);
  const profile = await getProfile(supabase, userId);
  const weakCriteria = await getWeakCriteria(supabase, userId);

  const weekdayMinutes = Math.max(20, profile.study_minutes_per_day ?? 60);
  const weekendMinutes = Math.max(weekdayMinutes + 20, Math.round(weekdayMinutes * 1.5));

  const dayRows = weekDates.map((dateKey, index) => {
    const isWeekend = index >= 5;
    const isMockDay = index === 5;
    return {
      user_id: userId,
      plan_date: dateKey,
      day_type: (isWeekend ? "weekend" : "weekday") as "weekday" | "weekend",
      target_minutes: isWeekend ? weekendMinutes : weekdayMinutes,
      is_mock_day: isMockDay,
    };
  });

  const { error: dayUpsertError } = await supabase
    .from("study_plan_days")
    .upsert(dayRows, { onConflict: "user_id,plan_date" });

  if (dayUpsertError) {
    throw new Error(dayUpsertError.message);
  }

  const { data: persistedDays, error: persistedDaysError } = await supabase
    .from("study_plan_days")
    .select("id, plan_date, day_type, target_minutes, is_mock_day")
    .eq("user_id", userId)
    .in("plan_date", weekDates)
    .order("plan_date", { ascending: true })
    .returns<PlanDayRow[]>();

  if (persistedDaysError) {
    throw new Error(persistedDaysError.message);
  }

  if (!persistedDays || persistedDays.length === 0) {
    throw new Error("Failed to create weekly plan days.");
  }

  if (options?.forceRegenerate) {
    const dayIds = persistedDays.map((day) => day.id);
    const { error: deleteError } = await supabase
      .from("study_plan_items")
      .delete()
      .in("plan_day_id", dayIds)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("study_plan_items")
    .select("id, plan_day_id")
    .eq("user_id", userId)
    .in(
      "plan_day_id",
      persistedDays.map((day) => day.id)
    );

  if (existingItemsError) {
    throw new Error(existingItemsError.message);
  }

  const itemCountByDay = new Map<string, number>();
  for (const item of existingItems ?? []) {
    const count = itemCountByDay.get(item.plan_day_id) ?? 0;
    itemCountByDay.set(item.plan_day_id, count + 1);
  }

  const nextItems: Array<{
    user_id: string;
    plan_day_id: string;
    title: string;
    description: string;
    focus_area: string;
    task_type: PlanItemRow["task_type"];
    weakness_key: string | null;
    weakness_label: string | null;
    planned_minutes: number;
    sort_order: number;
    status: "pending";
  }> = [];

  for (const day of persistedDays) {
    const shouldCreate = (itemCountByDay.get(day.id) ?? 0) === 0;
    if (!shouldCreate) continue;

    const isWeekend = day.day_type === "weekend";
    const weakCount = isWeekend ? 3 : 2;
    const minutePerWeak = isWeekend ? Math.max(20, Math.round(day.target_minutes * 0.22)) : Math.max(15, Math.round(day.target_minutes * 0.27));

    const dayWeak = weakCriteria.slice(0, weakCount);
    dayWeak.forEach((criterion, index) => {
      nextItems.push({
        user_id: userId,
        plan_day_id: day.id,
        title: buildTaskTitle(criterion, index, isWeekend),
        description: buildTaskDescription(criterion, profile.target_band),
        focus_area: criterion.label,
        task_type: criterionTaskType(criterion.key),
        weakness_key: criterion.key,
        weakness_label: criterion.label,
        planned_minutes: minutePerWeak,
        sort_order: index + 1,
        status: "pending",
      });
    });

    nextItems.push({
      user_id: userId,
      plan_day_id: day.id,
      title: isWeekend ? "Vocabulary Review Sprint" : "Quick Vocabulary Review",
      description: "Review saved words and make 5 example sentences.",
      focus_area: "Vocabulary",
      task_type: "vocabulary",
      weakness_key: null,
      weakness_label: null,
      planned_minutes: isWeekend ? 25 : 15,
      sort_order: 20,
      status: "pending",
    });

    if (day.is_mock_day) {
      nextItems.push({
        user_id: userId,
        plan_day_id: day.id,
        ...buildMockTask(day.target_minutes),
        status: "pending",
      });
    }
  }

  if (nextItems.length > 0) {
    const { error: insertItemsError } = await supabase.from("study_plan_items").insert(nextItems);
    if (insertItemsError) {
      throw new Error(insertItemsError.message);
    }
  }

  return { weekDates, weakCriteria };
}

async function buildWeekResponse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  startDate?: string
) {
  const { weekDates, weakCriteria } = await ensureWeekPlan(supabase, userId, { startDate });

  const { data: days, error: daysError } = await supabase
    .from("study_plan_days")
    .select("id, plan_date, day_type, target_minutes, is_mock_day")
    .eq("user_id", userId)
    .in("plan_date", weekDates)
    .order("plan_date", { ascending: true })
    .returns<PlanDayRow[]>();

  if (daysError) {
    throw new Error(daysError.message);
  }

  const dayIds = (days ?? []).map((day) => day.id);
  const { data: items, error: itemsError } = await supabase
    .from("study_plan_items")
    .select(
      "id, plan_day_id, title, description, focus_area, task_type, weakness_key, weakness_label, planned_minutes, status, sort_order"
    )
    .eq("user_id", userId)
    .in("plan_day_id", dayIds)
    .order("sort_order", { ascending: true })
    .returns<PlanItemRow[]>();

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { data: trendAttempts, error: trendError } = await supabase
    .from("writing_practice_attempts")
    .select("band_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80)
    .returns<Array<{ band_score: number; created_at: string }>>();

  if (trendError) {
    throw new Error(trendError.message);
  }

  const itemsByDay = new Map<string, PlanItemRow[]>();
  for (const item of items ?? []) {
    const bucket = itemsByDay.get(item.plan_day_id) ?? [];
    bucket.push(item);
    itemsByDay.set(item.plan_day_id, bucket);
  }

  const dayPayload = (days ?? []).map((day) => {
    const dayItems = itemsByDay.get(day.id) ?? [];
    const doneMinutes = dayItems
      .filter((item) => item.status === "done")
      .reduce((sum, item) => sum + item.planned_minutes, 0);
    const plannedMinutes = dayItems.reduce((sum, item) => sum + item.planned_minutes, 0);
    const completionRate = plannedMinutes === 0 ? 0 : Math.round((doneMinutes / plannedMinutes) * 100);

    return {
      id: day.id,
      date: day.plan_date,
      dayLabel: weekdayLabel(day.plan_date),
      dayType: day.day_type,
      targetMinutes: day.target_minutes,
      plannedMinutes,
      completedMinutes: doneMinutes,
      completionRate,
      isMockDay: day.is_mock_day,
      items: dayItems,
    };
  });

  const totalItems = dayPayload.reduce((sum, day) => sum + day.items.length, 0);
  const completedItems = dayPayload.reduce(
    (sum, day) => sum + day.items.filter((item) => item.status === "done").length,
    0
  );
  const totalMinutes = dayPayload.reduce((sum, day) => sum + day.plannedMinutes, 0);
  const doneMinutes = dayPayload.reduce((sum, day) => sum + day.completedMinutes, 0);

  const trendByWeek = new Map<string, { total: number; count: number }>();
  for (const row of trendAttempts ?? []) {
    const weekStart = getWeekStartMonday(new Date(row.created_at));
    const weekKey = toDateKey(weekStart);
    const bucket = trendByWeek.get(weekKey) ?? { total: 0, count: 0 };
    bucket.total += row.band_score;
    bucket.count += 1;
    trendByWeek.set(weekKey, bucket);
  }

  const weeklyBandTrend = [...trendByWeek.entries()]
    .map(([weekStart, value]) => ({
      weekStart,
      avgBand: Number((value.total / value.count).toFixed(2)),
      attempts: value.count,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-6);

  return {
    days: dayPayload,
    summary: {
      totalItems,
      completedItems,
      weekCompletionRate: totalMinutes === 0 ? 0 : Math.round((doneMinutes / totalMinutes) * 100),
      totalMinutes,
      doneMinutes,
    },
    weakCriteria,
    weeklyBandTrend,
  };
}

export async function GET(req: Request) {
  const { supabase, user } = await getAuthedContext();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const payload = await buildWeekResponse(supabase, user.id, startDate);
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load study plan." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { supabase, user } = await getAuthedContext();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await req.json();

  const toggleParsed = toggleItemSchema.safeParse(json);
  if (toggleParsed.success) {
    const { itemId, done } = toggleParsed.data;
    const { error } = await supabase
      .from("study_plan_items")
      .update({ status: done ? "done" : "pending", completed_at: done ? new Date().toISOString() : null })
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  }

  const regenerateParsed = regenerateSchema.safeParse(json);
  if (regenerateParsed.success) {
    try {
      await ensureWeekPlan(supabase, user.id, {
        startDate: regenerateParsed.data.startDate,
        forceRegenerate: true,
      });
      return Response.json({ ok: true });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Failed to regenerate week." },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Invalid action payload." }, { status: 400 });
}
