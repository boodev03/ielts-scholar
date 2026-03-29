import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  word: z.string().trim().min(2).max(40),
  minimalPair: z.string().trim().min(2).max(40),
  userTranscript: z.string().trim().min(1).max(80),
});

const responseSchema = z.object({
  pronunciationAccuracy: z.number().min(0).max(100),
  stressAccuracy: z.number().min(0).max(100),
  feedback: z.string(),
  correction: z.string(),
  nextDrill: z.string(),
});

function quickMatch(target: string, actual: string) {
  const t = target.toLowerCase().trim();
  const a = actual.toLowerCase().trim();
  if (t === a) return 100;
  if (a.includes(t)) return 85;
  return 45;
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

  const match = quickMatch(parsed.data.word, parsed.data.userTranscript);
  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS pronunciation micro-coach.",
      "Evaluate single-word pronunciation attempt using transcript evidence.",
      "Keep advice brief and actionable.",
    ].join("\n"),
    prompt: [
      `Target word: ${parsed.data.word}`,
      `Contrast minimal pair: ${parsed.data.minimalPair}`,
      `Learner transcript: ${parsed.data.userTranscript}`,
      `Quick lexical match hint: ${match}/100`,
    ].join("\n"),
  });

  return Response.json({
    pronunciationAccuracy: Math.round((object.pronunciationAccuracy + match) / 2),
    stressAccuracy: Math.round(object.stressAccuracy),
    feedback: object.feedback,
    correction: object.correction,
    nextDrill: object.nextDrill,
  });
}
