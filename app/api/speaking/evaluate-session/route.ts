import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { bandFromAccuracy, weightedAccuracy } from "@/lib/writing/scoring";

const transcriptItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(1000),
});

const requestSchema = z.object({
  transcript: z.array(transcriptItemSchema).min(2).max(120),
  durationSec: z.number().min(0).max(7200).optional(),
});

const responseSchema = z.object({
  criteria: z
    .array(
      z.object({
        key: z.enum([
          "fluency_coherence",
          "lexical_resource",
          "grammar_range_accuracy",
          "pronunciation",
        ]),
        score: z.number().min(0).max(100),
        comment: z.string(),
      })
    )
    .length(4),
  strengths: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(5),
  nextDrills: z.array(z.string()).max(3),
  briefExplanation: z.string(),
});

const criterionMeta = {
  fluency_coherence: { label: "Fluency & Coherence", weight: 0.3 },
  lexical_resource: { label: "Lexical Resource", weight: 0.2 },
  grammar_range_accuracy: { label: "Grammar Range & Accuracy", weight: 0.25 },
  pronunciation: { label: "Pronunciation", weight: 0.25 },
} as const;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  const json = await req.json();
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { transcript, durationSec } = parsed.data;
  const transcriptText = transcript
    .map((item, idx) => `${idx + 1}. ${item.role.toUpperCase()}: ${item.text}`)
    .join("\n");

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS speaking examiner.",
      "Score this speaking transcript conservatively and provide practical coaching.",
      "Always output exactly 4 criteria.",
    ].join("\n"),
    prompt: [
      "Evaluate the learner speaking turns only, but consider conversational context.",
      durationSec ? `Session duration (sec): ${durationSec}` : "Session duration unavailable.",
      "Transcript:",
      transcriptText,
    ].join("\n"),
  });

  const criteria = object.criteria.map((item) => ({
    key: item.key,
    label: criterionMeta[item.key].label,
    weight: criterionMeta[item.key].weight,
    score: Math.max(0, Math.min(100, Math.round(item.score))),
    comment: item.comment.trim() || "Keep practicing this area.",
  }));

  const accuracy = weightedAccuracy(criteria);
  const bandScore = bandFromAccuracy(accuracy);

  return Response.json({
    criteria,
    accuracy,
    bandScore,
    strengths: object.strengths,
    improvements: object.improvements,
    nextDrills: object.nextDrills,
    briefExplanation: object.briefExplanation,
  });
}
