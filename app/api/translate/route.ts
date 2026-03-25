import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  targetLanguage: z.string().trim().min(2).max(40).default("Vietnamese"),
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

  const { text, targetLanguage } = parsed.data;

  const result = await generateText({
    model: google("gemini-2.5-pro"),
    system:
      "You are a precise translation assistant. Return only the translation text, with no labels, no quotes, no extra commentary.",
    prompt: `Translate this text to ${targetLanguage}:\n\n${text}`,
  });

  return Response.json({ translation: result.text.trim() });
}
