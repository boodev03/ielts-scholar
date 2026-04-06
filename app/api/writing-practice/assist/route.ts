import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const requestSchema = z.object({
  messages: z.array(z.unknown()),
  currentSentence: z.string().trim().max(600).optional(),
  nativeLanguage: z.string().trim().max(40).optional(),
});

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response("Missing GOOGLE_GENERATIVE_AI_API_KEY in environment variables.", {
      status: 500,
    });
  }

  const json = await req.json();
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return new Response("Invalid request payload.", { status: 400 });
  }

  const { messages, currentSentence, nativeLanguage } = parsed.data;
  const lang = nativeLanguage ?? "Vietnamese";

  const contextBlock = currentSentence
    ? `The learner is currently translating this sentence from ${lang} to English:\n"${currentSentence}"\nUse this as context when answering vocabulary or grammar questions.`
    : `The learner is doing a sentence translation exercise (${lang} → English).`;

  const result = streamText({
    model: google("gemini-2.5-flash-preview-05-20"),
    system: [
      `You are a friendly IELTS writing tutor helping a ${lang} speaker practice English translation.`,
      contextBlock,
      "Answer questions about vocabulary, grammar, idioms, or phrasing.",
      "Keep answers short and practical (2-4 sentences max unless asked for more).",
      "If the user asks what a word means or how to say something in English, give a direct answer with a usage example.",
      `If the user writes in ${lang}, respond in ${lang} but keep English examples in English.`,
      "Do not evaluate their translation — just answer the question asked.",
    ].join("\n"),
    messages: await convertToModelMessages(messages as UIMessage[]),
  });

  return result.toUIMessageStreamResponse();
}
