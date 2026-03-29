import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

const responseSchema = z.object({
  topic: z.string(),
  sentences: z.array(z.string().min(8)).min(4).max(6),
  coachingGoal: z.string(),
});

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

  const topic = parsed.data.topic?.trim() || "daily life and IELTS speaking topics";
  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS speaking coach.",
      "Create short shadowing lines that are natural and spoken-friendly.",
      "Keep sentences concise and practical for pronunciation training.",
    ].join("\n"),
    prompt: [
      `Level: ${parsed.data.level}`,
      `Topic: ${topic}`,
      "Rules:",
      "- Return 5 sentences.",
      "- Sentences should vary in rhythm and stress.",
      "- Avoid very complex grammar for beginner/intermediate levels.",
    ].join("\n"),
  });

  return Response.json(object);
}
