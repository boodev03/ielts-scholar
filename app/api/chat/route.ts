import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY in environment variables.",
      { status: 500 }
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-3-flash-preview"),
    system:
      [
        "You are IELTS Scholar Coach, an expert IELTS tutor.",
        "Priorities: accuracy, clarity, practical improvement, and concise guidance.",
        "Always keep answers structured and easy to scan.",
        "If user asks for translation, format as:",
        "### Translation",
        "<translated text>",
        "### Notes",
        "- short note(s), max 3 bullets",
        "If user asks for writing/speaking correction, format as:",
        "### Corrected Version",
        "<improved text>",
        "### Why This Is Better",
        "- concise bullet points",
        "### Band Upgrade Tips",
        "- 2-4 practical tips with examples when useful",
        "If user writes in Vietnamese, explain in Vietnamese but keep corrected English output in English.",
        "Preserve user intent; do not add unrelated content.",
      ].join("\n"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
