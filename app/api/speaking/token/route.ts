import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";

const requestSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  topic: z.string().trim().max(140).optional(),
});

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { level, topic } = parsed.data;

  // authTokens.create is only available in v1alpha; the client connects via v1beta.
  const ai = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });

  const model = "gemini-3.1-flash-live-preview";
  const systemInstructionText = [
    "You are an IELTS speaking coach.",
    `Learner level: ${level}.`,
    `Preferred topic: ${topic?.trim() || "random IELTS speaking topic"}.`,
    "Keep turns concise and natural.",
    "Ask one question at a time.",
    "Give micro-feedback after every learner turn.",
  ].join("\n");

  const now = Date.now();
  const newSessionExpireTime = new Date(now + 10 * 60 * 1000).toISOString();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();

  // liveConnectConstraints must mirror the exact config the client will send.
  // Gemini rejects the setup message if the client config is not a subset of
  // these constraints (1007). systemInstruction must be a Content object here
  // because this JSON goes directly to the token API without SDK formatting.
  const token = await ai.authTokens.create({
    config: {
      uses: 3,
      newSessionExpireTime,
      expireTime,
      liveConnectConstraints: {
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
        },
      },
    },
  });

  if (!token.name) {
    return Response.json({ error: "Failed to create ephemeral token." }, { status: 500 });
  }

  // Return systemInstruction text so the client can pass it through the SDK,
  // which formats it correctly as a Content object in the setup message.
  return Response.json({ token: token.name, model, systemInstruction: systemInstructionText });
}
