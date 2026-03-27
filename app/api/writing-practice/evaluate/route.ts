import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  sourceSentence: z.string().trim().min(2).max(500),
  userTranslation: z.string().trim().min(1).max(500),
  nativeLanguage: z.string().trim().min(2).max(40),
});

const responseSchema = z.object({
  correctedTranslation: z.string(),
  accuracy: z.number().min(0).max(100),
  bandScore: z.number().min(0).max(9),
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

  const { sourceSentence, userTranslation, nativeLanguage } = parsed.data;

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are a strict but helpful IELTS translation evaluator.",
      "Evaluate semantic accuracy, grammar, lexical choice, and naturalness.",
      "Keep feedback concise and practical.",
      "Corrected translation must be idiomatic English.",
    ].join("\n"),
    prompt: [
      `Source sentence in native language (${nativeLanguage}): ${sourceSentence}`,
      `User English translation: ${userTranslation}`,
      "Scoring rules:",
      "- accuracy: 0-100 (meaning preservation + grammar + naturalness)",
      "- bandScore: IELTS-like estimate (0-9)",
      "- strengths: what user did right",
      "- improvements: specific fixes with focus on actionable changes",
      "- briefExplanation: 1-2 short sentences",
    ].join("\n"),
  });

  return Response.json(object);
}
