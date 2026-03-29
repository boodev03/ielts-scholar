import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  targetSentence: z.string().trim().min(3).max(300),
  userTranscript: z.string().trim().min(1).max(300),
  userDurationMs: z.number().min(300).max(20000).optional(),
  targetDurationMs: z.number().min(300).max(20000).optional(),
});

const responseSchema = z.object({
  timing: z.number().min(0).max(100),
  intonation: z.number().min(0).max(100),
  stress: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  mistakes: z.array(z.string()).max(4),
  retryChunk: z.string(),
  drillTip: z.string(),
});

function wordOverlapScore(target: string, actual: string) {
  const t = new Set(target.toLowerCase().split(/\s+/).filter(Boolean));
  const a = new Set(actual.toLowerCase().split(/\s+/).filter(Boolean));
  if (t.size === 0) return 0;
  let hit = 0;
  for (const w of t) {
    if (a.has(w)) hit += 1;
  }
  return Math.round((hit / t.size) * 100);
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { targetSentence, userTranscript, userDurationMs, targetDurationMs } = parsed.data;
  const lexicalMatch = wordOverlapScore(targetSentence, userTranscript);
  const durationPenalty =
    userDurationMs && targetDurationMs
      ? Math.min(30, Math.round((Math.abs(userDurationMs - targetDurationMs) / targetDurationMs) * 100))
      : 0;

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS shadowing coach.",
      "Evaluate timing, intonation, stress, and clarity conservatively.",
      "Give short practical corrections.",
    ].join("\n"),
    prompt: [
      `Target sentence: ${targetSentence}`,
      `Learner transcript: ${userTranscript}`,
      `Lexical match score hint: ${lexicalMatch}/100`,
      userDurationMs && targetDurationMs
        ? `Duration hint. learner=${userDurationMs}ms, target=${targetDurationMs}ms, penalty=${durationPenalty}`
        : "No duration hint available.",
    ].join("\n"),
  });

  const timing = Math.max(0, Math.min(100, Math.round(object.timing - durationPenalty / 2)));
  const clarity = Math.max(0, Math.min(100, Math.round((object.clarity + lexicalMatch) / 2)));
  const intonation = Math.max(0, Math.min(100, Math.round(object.intonation)));
  const stress = Math.max(0, Math.min(100, Math.round(object.stress)));
  const overall = Math.round(timing * 0.25 + intonation * 0.25 + stress * 0.2 + clarity * 0.3);

  return Response.json({
    timing,
    intonation,
    stress,
    clarity,
    overall,
    mistakes: object.mistakes,
    retryChunk: object.retryChunk,
    drillTip: object.drillTip,
  });
}
