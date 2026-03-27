import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  exerciseType: z.enum(["sentence-translation", "topic-writing"]),
  nativeLanguage: z.string().trim().min(2).max(40),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  topic: z.string().trim().min(2).max(120).optional(),
});

const sentenceTranslationSchema = z.object({
  mode: z.literal("sentence-translation"),
  title: z.string(),
  paragraph: z.string(),
  sentences: z.array(z.string().min(5)).min(3).max(6),
  tips: z.array(z.string()).max(4).default([]),
});

const topicWritingSchema = z.object({
  mode: z.literal("topic-writing"),
  title: z.string(),
  description: z.string(),
  bulletPoints: z.array(z.string()).min(2).max(5),
  tips: z.array(z.string()).max(4).default([]),
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

  const { exerciseType, nativeLanguage, level, topic } = parsed.data;
  const resolvedTopic = topic?.trim() || "random IELTS exam topic";

  if (exerciseType === "sentence-translation") {
    const { object } = await generateObject({
      model: google("gemini-2.5-pro"),
      schema: sentenceTranslationSchema,
      system: [
        "You are an IELTS writing practice generator.",
        "Create short paragraph translation exercises in the user's native language.",
        "Keep output concise and learner-friendly.",
      ].join("\n"),
      prompt: [
        `Mode: sentence-by-sentence translation practice`,
        `Native language: ${nativeLanguage}`,
        `Level: ${level}`,
        `Topic: ${resolvedTopic}`,
        "Rules:",
        "- Generate exactly 4 sentences.",
        "- Return the whole paragraph plus individual sentence list.",
        "- Sentences must be realistic and coherent.",
        "- Return short actionable tips.",
      ].join("\n"),
    });

    return Response.json(object);
  }

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: topicWritingSchema,
    system: [
      "You are an IELTS writing prompt generator.",
      "Create writing prompts that are clear, practical, and level-appropriate.",
    ].join("\n"),
    prompt: [
      `Mode: topic writing practice`,
      `Native language: ${nativeLanguage}`,
      `Level: ${level}`,
      `Topic preference: ${resolvedTopic}`,
      "Rules:",
      "- Return one topic title and a short task description.",
      "- Add 3-4 guiding bullet points for what to include.",
      "- Add concise tips for higher IELTS writing score.",
    ].join("\n"),
  });

  return Response.json(object);
}
