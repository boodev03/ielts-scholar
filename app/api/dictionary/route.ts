import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  targetLanguage: z.string().trim().min(2).max(40).default("Vietnamese"),
});

const dictionarySchema = z.object({
  selectedText: z.string(),
  ipa: z.string().default(""),
  globalTranslation: z.string().default(""),
  entries: z
    .array(
      z.object({
        partOfSpeech: z.string(),
        translation: z.string(),
        meanings: z.array(z.string()).default([]),
        examples: z.array(z.string()).default([]),
      })
    )
    .default([]),
  notes: z.array(z.string()).default([]),
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

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: dictionarySchema,
    system:
      "You are an advanced bilingual dictionary assistant for IELTS learners. Return accurate, concise lexical information.",
    prompt: [
      `Analyze this selected text: "${text}"`,
      `Target language for translation: ${targetLanguage}.`,
      "Rules:",
      "- Return IPA if possible.",
      "- Provide a global translation.",
      "- If the text can have multiple word classes, include multiple entries (noun/verb/adjective/adverb/etc).",
      "- For each entry provide short meanings and 1-2 practical examples.",
      "- If input is phrase/sentence, still provide useful entry with best-fit partOfSpeech.",
      "- Keep content concise and learner-friendly.",
    ].join("\n"),
  });

  return Response.json(object);
}
