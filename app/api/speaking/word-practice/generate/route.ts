import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  topic: z.string().trim().min(2).max(120).optional(),
});

const responseSchema = z.object({
  title: z.string(),
  words: z
    .array(
      z.object({
        word: z.string(),
        ipa: z.string(),
        meaning: z.string(),
        example: z.string(),
        mouthTip: z.string(),
        minimalPair: z.string(),
      })
    )
    .min(8)
    .max(12),
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

  const topic = parsed.data.topic?.trim() || "high-frequency IELTS speaking vocabulary";

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: responseSchema,
    system: [
      "You are an IELTS pronunciation coach.",
      "Create practical word-practice sets for speaking.",
      "Focus on words that are useful in IELTS speaking answers.",
    ].join("\n"),
    prompt: [
      `Level: ${parsed.data.level}`,
      `Topic: ${topic}`,
      "Rules:",
      "- Return exactly 10 words.",
      "- Include IPA, short meaning, one simple example sentence.",
      "- Provide one concrete mouthTip.",
      "- Provide one common minimal pair to contrast pronunciation.",
    ].join("\n"),
  });

  return Response.json(object);
}
