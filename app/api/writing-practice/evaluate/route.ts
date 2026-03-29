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
  sourceSentence: z.string().trim().min(2).max(500),
  userTranslation: z.string().trim().min(1).max(500),
  nativeLanguage: z.string().trim().min(2).max(40),
  adaptiveContext: z
    .object({
      weakCriteria: z.array(z.string()).max(4).optional(),
    })
    .optional(),
});

const responseSchema = z.object({
  correctedTranslation: z.string(),
  criteria: z
    .array(
      z.object({
        key: z.enum([
          "semantic_accuracy",
          "grammar_control",
          "lexical_choice",
          "naturalness",
        ]),
        score: z.number().min(0).max(100),
        comment: z.string(),
      })
    )
    .length(4),
  strengths: z.array(z.string()).max(4).default([]),
  improvements: z.array(z.string()).max(4).default([]),
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

  const { sourceSentence, userTranslation, nativeLanguage, adaptiveContext } = parsed.data;

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are a strict but helpful IELTS translation evaluator.",
      "Evaluate semantic accuracy, grammar, lexical choice, and naturalness.",
      "Keep feedback concise and practical.",
      "Corrected translation must be idiomatic English.",
      "Return all four criteria exactly once.",
    ].join("\n"),
    prompt: [
      `Source sentence in native language (${nativeLanguage}): ${sourceSentence}`,
      `User English translation: ${userTranslation}`,
      adaptiveContext?.weakCriteria?.length
        ? `Learner weak criteria from recent history: ${adaptiveContext.weakCriteria.join(", ")}`
        : "No prior learner profile available.",
      "Scoring rules:",
      "- criteria scores: 0-100 for each criterion",
      "- strengths: what user did right",
      "- improvements: specific fixes with focus on actionable changes",
      "- briefExplanation: 1-2 short sentences",
    ].join("\n"),
  });

  const criteria = normalizeCriterionScores("sentence-translation", object.criteria);
  const accuracy = weightedAccuracy(criteria);
  const bandScore = bandFromAccuracy(accuracy);

  return Response.json({
    correctedTranslation: object.correctedTranslation,
    criteria,
    accuracy,
    bandScore,
    strengths: object.strengths,
    improvements: object.improvements,
    briefExplanation: object.briefExplanation,
    focusAreas: topWeakCriteria(criteria, 2),
  });
}
