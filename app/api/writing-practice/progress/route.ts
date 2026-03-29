import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type CriterionScore } from "@/lib/writing/scoring";

const criterionSchema = z.object({
  key: z.string().min(2).max(64),
  label: z.string().min(2).max(120),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  comment: z.string().min(1).max(500),
});

const createAttemptSchema = z.object({
  exerciseMode: z.enum(["sentence-translation", "topic-writing", "speaking-live"]),
  accuracy: z.number().min(0).max(100),
  bandScore: z.number().min(0).max(9),
  criteria: z.array(criterionSchema).min(1).max(8),
  meta: z.record(z.string(), z.unknown()).optional(),
});

type WritingProgressRow = {
  id: string;
  exercise_mode: ExerciseMode;
  overall_accuracy: number;
  band_score: number;
  criterion_scores: CriterionScore[];
  created_at: string;
};

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("writing_practice_attempts")
    .select("id, exercise_mode, overall_accuracy, band_score, criterion_scores, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(120)
    .returns<WritingProgressRow[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ attempts: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, user } = await getAuthedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await req.json();
  const parsed = createAttemptSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseMode, accuracy, bandScore, criteria, meta } = parsed.data;
  const { error } = await supabase.from("writing_practice_attempts").insert({
    user_id: user.id,
    exercise_mode: exerciseMode,
    overall_accuracy: accuracy,
    band_score: bandScore,
    criterion_scores: criteria,
    meta: meta ?? {},
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
type ExerciseMode = "sentence-translation" | "topic-writing" | "speaking-live";
