import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  topicTitle: z.string().trim().min(3).max(160),
  topicDescription: z.string().trim().min(3).max(800),
  userWriting: z.string().trim().min(20).max(5000),
});

const responseSchema = z.object({
  accuracy: z.number().min(0).max(100),
  bandScore: z.number().min(0).max(9),
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

  const { topicTitle, topicDescription, userWriting } = parsed.data;

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS writing examiner and tutor.",
      "Evaluate writing quality with actionable, concise guidance.",
      "Focus on task response, coherence, lexical resource, and grammar.",
    ].join("\n"),
    prompt: [
      `Topic: ${topicTitle}`,
      `Task description: ${topicDescription}`,
      `Learner draft:\n${userWriting}`,
      "Scoring:",
      "- accuracy 0-100 for relevance + grammar + clarity",
      "- IELTS-like band 0-9",
      "Output:",
      "- strengths and improvements as short bullet points",
      "- improvedDraft as a corrected concise version",
      "- briefExplanation in 1-2 short sentences",
    ].join("\n"),
  });

  return Response.json(object);
}
