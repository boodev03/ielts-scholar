import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import {
  bandFromAccuracy,
  normalizeCriterionScores,
  topWeakCriteria,
  weightedAccuracy,
} from "@/lib/writing/scoring";

const requestSchema = z.object({
  topicTitle: z.string().trim().min(3).max(160),
  topicDescription: z.string().trim().min(3).max(800),
  userWriting: z.string().trim().min(20).max(5000),
  adaptiveContext: z
    .object({
      weakCriteria: z.array(z.string()).max(4).optional(),
    })
    .optional(),
});

const responseSchema = z.object({
  criteria: z
    .array(
      z.object({
        key: z.enum([
          "task_response",
          "coherence_cohesion",
          "lexical_resource",
          "grammar_range_accuracy",
        ]),
        score: z.number().min(0).max(100),
        comment: z.string(),
      })
    )
    .length(4),
  strengths: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(5),
  improvedDraft: z.string(),
  briefExplanation: z.string(),
});

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

  const { topicTitle, topicDescription, userWriting, adaptiveContext } = parsed.data;

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS writing examiner and tutor.",
      "Evaluate writing quality with actionable, concise guidance.",
      "Focus on task response, coherence, lexical resource, and grammar.",
      "Return all four criteria exactly once.",
    ].join("\n"),
    prompt: [
      `Topic: ${topicTitle}`,
      `Task description: ${topicDescription}`,
      `Learner draft:\n${userWriting}`,
      adaptiveContext?.weakCriteria?.length
        ? `Learner weak criteria from recent history: ${adaptiveContext.weakCriteria.join(", ")}`
        : "No prior learner profile available.",
      "Scoring:",
      "- criteria scores: 0-100 for each criterion",
      "Output:",
      "- strengths and improvements as short bullet points",
      "- improvedDraft as a corrected concise version",
      "- briefExplanation in 1-2 short sentences",
    ].join("\n"),
  });

  const criteria = normalizeCriterionScores("topic-writing", object.criteria);
  const accuracy = weightedAccuracy(criteria);
  const bandScore = bandFromAccuracy(accuracy);

  return Response.json({
    criteria,
    accuracy,
    bandScore,
    strengths: object.strengths,
    improvements: object.improvements,
    improvedDraft: object.improvedDraft,
    briefExplanation: object.briefExplanation,
    focusAreas: topWeakCriteria(criteria, 2),
  });
}
