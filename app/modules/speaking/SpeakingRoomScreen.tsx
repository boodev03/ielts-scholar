"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Microphone,
  PhoneDisconnect,
} from "@phosphor-icons/react";
import { GoogleGenAI, Modality } from "@google/genai";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider } from "@/components/ui/sidebar";

type TranscriptItem = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts: number;
  audioUrl?: string;
};

type SpeakingFeedback = {
  criteria: Array<{
    key: string;
    label: string;
    score: number;
    weight: number;
    comment: string;
  }>;
  accuracy: number;
  bandScore: number;
  strengths: string[];
  improvements: string[];
  nextDrills: string[];
  briefExplanation: string;
};

function isSpeakingFeedback(payload: unknown): payload is SpeakingFeedback {
  if (typeof payload !== "object" || payload === null) return false;
  const item = payload as Partial<SpeakingFeedback>;
  return (
    typeof item.accuracy === "number" &&
    typeof item.bandScore === "number" &&
    Array.isArray(item.criteria) &&
    Array.isArray(item.strengths) &&
    Array.isArray(item.improvements) &&
    Array.isArray(item.nextDrills) &&
    typeof item.briefExplanation === "string"
  );
}

function floatToPcm16(float32: Float32Array) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function downsample(input: Float32Array, inputRate: number, outputRate: number) {
  if (outputRate >= inputRate) return input;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffset = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffset && i < input.length; i += 1) {
      accum += input[i] ?? 0;
      count += 1;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffset;
  }
  return result;
}

function pcm16ToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToPcm16(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function pcm16ChunksToWavBlob(chunks: Int16Array[], sampleRate: number) {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (totalSamples === 0) return null;

  const bytesPerSample = 2;
  const dataSize = totalSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      view.setInt16(offset, chunk[i] ?? 0, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export default function SpeakingRoomScreen() {
  return <SpeakingRoomScreenInner />;
}

type SpeakingRoomScreenProps = {
  embedded?: boolean;
};

export function SpeakingRoomScreenInner({ embedded = false }: SpeakingRoomScreenProps = {}) {
  const [screen, setScreen] = useState<"ready" | "live">("ready");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [lastFeedback, setLastFeedback] = useState<SpeakingFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const sessionRef = useRef<Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null>(null);
  const isClosingRef = useRef(false);
  const isSessionReadyRef = useRef(false);
  const isEvaluatingRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playheadRef = useRef(0);
  const assistantTurnIdRef = useRef<string | null>(null);
  const userTurnIdRef = useRef<string | null>(null);
  const userAudioChunksRef = useRef<Record<string, Int16Array[]>>({});
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const transcriptRef = useRef<TranscriptItem[]>([]);

  const conversationItems = useMemo(
    () => transcript.filter((item) => item.role !== "system"),
    [transcript]
  );

  const speakingTurns = useMemo(
    () => transcript.filter((item) => item.role === "user" || item.role === "assistant"),
    [transcript]
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const pushTranscript = (item: Omit<TranscriptItem, "id" | "ts">) => {
    assistantTurnIdRef.current = null;
    userTurnIdRef.current = null;
    setTranscript((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: Date.now(),
        ...item,
      },
    ]);
  };

  const finalizeUserTurnAudio = (turnId: string) => {
    const chunks = userAudioChunksRef.current[turnId];
    if (!chunks || chunks.length === 0) return;
    const blob = pcm16ChunksToWavBlob(chunks, 16000);
    delete userAudioChunksRef.current[turnId];
    if (!blob) return;
    const audioUrl = URL.createObjectURL(blob);
    setTranscript((prev) =>
      prev.map((item) => (item.id === turnId ? { ...item, audioUrl } : item)),
    );
  };

  // Appends a transcription chunk to the current turn bubble, or starts a new one.
  const upsertTranscript = (role: "user" | "assistant", chunk: string) => {
    const idRef = role === "assistant" ? assistantTurnIdRef : userTurnIdRef;
    if (idRef.current) {
      setTranscript((prev) =>
        prev.map((item) =>
          item.id === idRef.current ? { ...item, text: item.text + chunk } : item,
        ),
      );
    } else {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      idRef.current = id;
      if (role === "user") {
        userAudioChunksRef.current[id] = [];
      }
      setTranscript((prev) => [...prev, { id, role, text: chunk, ts: Date.now() }]);
    }
  };

  const sealTurns = () => {
    if (userTurnIdRef.current) {
      finalizeUserTurnAudio(userTurnIdRef.current);
    }
    assistantTurnIdRef.current = null;
    userTurnIdRef.current = null;
  };

  const playPcmChunk = (base64Data: string) => {
    const pcm16 = base64ToPcm16(base64Data);
    if (pcm16.length === 0) return;

    const sampleRate = 24000;
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i += 1) {
      float32[i] = (pcm16[i] ?? 0) / 0x8000;
    }

    const ctx = audioContextRef.current ?? new AudioContext({ sampleRate });
    audioContextRef.current = ctx;
    const buffer = ctx.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, playheadRef.current);
    source.start(startAt);
    playheadRef.current = startAt + buffer.duration;
  };

  const stopMic = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current) {
      void micContextRef.current.close();
      micContextRef.current = null;
    }
    setIsMicOn(false);
  };

  const startMic = async () => {
    if (!sessionRef.current || isMicOn) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;

    const ctx = new AudioContext();
    micContextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (!isSessionReadyRef.current || !sessionRef.current) {
        return;
      }
      const raw = event.inputBuffer.getChannelData(0);
      const down = downsample(raw, ctx.sampleRate, 16000);
      const pcm = floatToPcm16(down);
      const activeUserTurnId = userTurnIdRef.current;
      if (activeUserTurnId) {
        const chunks = userAudioChunksRef.current[activeUserTurnId];
        if (chunks) {
          chunks.push(pcm);
        }
      }
      const data = pcm16ToBase64(pcm);
      try {
        sessionRef.current.sendRealtimeInput({
          audio: { mimeType: "audio/pcm;rate=16000", data },
        });
      } catch {
        // Socket is already closing/closed; stop audio pipeline quietly.
        stopMic();
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    setIsMicOn(true);
  };

  const evaluateAndPersistSession = async (snapshot: TranscriptItem[]) => {
    const turns = snapshot.filter((item) => item.role === "user" || item.role === "assistant");
    const userTurns = turns.filter((item) => item.role === "user");
    if (userTurns.length === 0 || isEvaluatingRef.current) return;

    const durationSec =
      sessionStartedAtRef.current !== null
        ? Math.max(0, Math.round((Date.now() - sessionStartedAtRef.current) / 1000))
        : undefined;

    isEvaluatingRef.current = true;
    setFeedbackLoading(true);
    try {
      const evaluateRes = await fetch("/api/speaking/evaluate-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: turns.map((item) => ({ role: item.role, text: item.text })),
          durationSec,
        }),
      });
      const evaluateJson: unknown = await evaluateRes.json();
      if (!evaluateRes.ok || !isSpeakingFeedback(evaluateJson)) {
        return;
      }

      setLastFeedback(evaluateJson);

      await fetch("/api/writing-practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseMode: "speaking-live",
          accuracy: evaluateJson.accuracy,
          bandScore: evaluateJson.bandScore,
          criteria: evaluateJson.criteria,
          meta: {
            turns: turns.length,
            durationSec: durationSec ?? null,
          },
        }),
      });
    } catch {
      // Best-effort post-session report.
    } finally {
      setFeedbackLoading(false);
      isEvaluatingRef.current = false;
    }
  };

  const disconnectSession = () => {
    const snapshot = transcriptRef.current;
    void evaluateAndPersistSession(snapshot);
    isClosingRef.current = true;
    isSessionReadyRef.current = false;
    stopMic();
    sessionRef.current?.close();
    sessionRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    setScreen("ready");
    setTimeout(() => {
      isClosingRef.current = false;
    }, 0);
  };

  const connectSession = async () => {
    setIsConnecting(true);
    try {
      const tokenRes = await fetch("/api/speaking/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const tokenJson = (await tokenRes.json()) as {
        token?: string;
        model?: string;
        systemInstruction?: string;
        error?: string;
      };
      if (!tokenRes.ok || !tokenJson.token || !tokenJson.model) {
        throw new Error(tokenJson.error || "Failed to initialize speaking session.");
      }

      const ai = new GoogleGenAI({ apiKey: tokenJson.token, httpOptions: { apiVersion: "v1alpha" } });
      sessionStartedAtRef.current = Date.now();
      for (const item of transcriptRef.current) {
        if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      }
      setTranscript([]);
      userAudioChunksRef.current = {};
      const session = await ai.live.connect({
        model: tokenJson.model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          // The SDK formats this string as { parts: [{ text }] } in the
          // setup message, matching the Content object stored in the token
          // constraints — so Gemini accepts it without a 1007 mismatch.
          ...(tokenJson.systemInstruction
            ? { systemInstruction: tokenJson.systemInstruction }
            : {}),
        },
        callbacks: {
          onopen: () => {
            isSessionReadyRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
            pushTranscript({ role: "system", text: "Connected. Start speaking when ready." });
          },
          onmessage: (msg) => {
            const content = msg.serverContent;

            // Accumulate transcription chunks into the current turn bubble.
            if (content?.inputTranscription?.text) {
              upsertTranscript("user", content.inputTranscription.text);
            }
            if (content?.outputTranscription?.text) {
              upsertTranscript("assistant", content.outputTranscription.text);
            }

            // Seal the current turn bubbles when the model finishes speaking.
            if (content?.turnComplete) {
              sealTurns();
            }

            // Audio (docs: serverContent.modelTurn.parts[].inlineData.data)
            if (content?.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playPcmChunk(part.inlineData.data);
                }
              }
            }
          },
          onerror: (event) => {
            isSessionReadyRef.current = false;
            const message = event.message || "Live connection error.";
            pushTranscript({ role: "system", text: `Error: ${message}` });
            toast.error(message);
          },
          onclose: (event) => {
            const snapshot = transcriptRef.current;
            void evaluateAndPersistSession(snapshot);
            isSessionReadyRef.current = false;
            stopMic();
            sessionRef.current = null;
            setIsConnected(false);
            setIsConnecting(false);

            const details = `code=${event.code}${event.reason ? ` reason=${event.reason}` : ""}`;
            if (isClosingRef.current) {
              pushTranscript({ role: "system", text: "Session ended." });
              return;
            }
            setScreen("ready");
            pushTranscript({ role: "system", text: `Session ended (${details}).` });
          },
        },
      });

      sessionRef.current = session;

      // Auto-start microphone and let AI greet first after session is assigned.
      await startMic().catch(() => {
        toast.error("Microphone permission denied or unavailable.");
      });

      // Kick off the conversation — use sendRealtimeInput (not sendClientContent)
      // so the text and the mic audio stream stay in the same protocol channel.
      sessionRef.current?.sendRealtimeInput({
        text: "Please greet the student and ask the first IELTS speaking question.",
      });
      return true;
    } catch (error) {
      isSessionReadyRef.current = false;
      setIsConnecting(false);
      setIsConnected(false);
      toast.error(error instanceof Error ? error.message : "Unable to connect.");
      return false;
    }
  };

  const handleStartSpeaking = async () => {
    if (isConnected) {
      setScreen("live");
      return;
    }
    const connected = await connectSession();
    if (connected) {
      setScreen("live");
    }
  };

  useEffect(() => {
    return () => {
      for (const item of transcriptRef.current) {
        if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      }
      isClosingRef.current = true;
      isSessionReadyRef.current = false;
      stopMic();
      sessionRef.current?.close();
      sessionRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const content = (
    <>
      {screen === "ready" ? (
            <Card className="mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center rounded-3xl border-outline-variant/30 bg-surface-container-lowest px-6 py-12 text-center">
              <div className="relative mb-6 grid h-36 w-36 place-items-center rounded-full border border-outline-variant/35 bg-white shadow-[0_16px_34px_rgba(25,28,30,0.12)]">
                <Image src="/logo.png" alt="AI Mascot" fill className="rounded-full object-cover" />
              </div>
              <h1 className="text-6xl font-semibold text-[#161f39]" style={{ fontFamily: "var(--font-display)" }}>
                Ready to start?
              </h1>
              <p className="mt-3 text-2xl text-[#4d5c79]">
                Your AI examiner is prepared to guide you through
              </p>
              <div className="mt-7 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={`size-14 rounded-full ${isMicOn ? "border-emerald-300 text-emerald-700" : ""}`}
                  disabled={!isConnected && isConnecting}
                  onClick={() => void (isMicOn ? stopMic() : startMic())}
                >
                  <Microphone size={20} weight="fill" />
                </Button>
                <Button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => void handleStartSpeaking()}
                  className="h-14 rounded-full bg-[linear-gradient(135deg,#111a33,#2f3b61)] px-10 text-lg font-semibold text-white shadow-[0_14px_32px_rgba(17,26,51,0.35)] hover:opacity-95"
                >
                  {isConnecting ? "Connecting..." : "Start Speaking"}
                </Button>
              </div>
              <p className="mt-6 text-sm font-medium text-[#6b7897]">Joined by 1.2k candidates today</p>
              {feedbackLoading ? (
                <p className="mt-4 text-sm text-[#5b6e8f]">Generating speaking report...</p>
              ) : null}
              {lastFeedback ? (
                <div className="mt-5 w-full max-w-3xl rounded-2xl border border-outline-variant/35 bg-white p-4 text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#163f72]">Last Speaking Report</p>
                    <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                      Band {lastFeedback.bandScore.toFixed(1)}
                    </Badge>
                  </div>
                  <p className="mb-3 text-xs text-[#5b6e8f]">{lastFeedback.briefExplanation}</p>
                  <div className="space-y-2">
                    {lastFeedback.criteria.map((item) => (
                      <div key={item.key}>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs text-[#193055]">{item.label}</p>
                          <p className="text-xs text-[#5b6e8f]">{item.score}%</p>
                        </div>
                        <Progress value={item.score} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                  {lastFeedback.nextDrills.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lastFeedback.nextDrills.map((drill) => (
                        <Badge key={drill} variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                          Drill: {drill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ) : (
            <Card className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-outline-variant/30 bg-surface-container-lowest px-6 py-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-2 grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-[#0b3f78] shadow-[0_10px_24px_rgba(11,63,120,0.35)]">
                  <Image src="/logo.png" alt="AI Mascot" width={42} height={42} className="rounded-full" />
                </div>
                <Badge className="mb-2 rounded-full bg-white text-[#163f72]">{isMicOn ? "Listening" : "Standby"}</Badge>
                <h2 className="text-5xl font-semibold text-[#103e70]" style={{ fontFamily: "var(--font-display)" }}>
                  Speaking Room
                </h2>
                <p className="mt-1 text-xl text-[#5b6e8f]">Realtime conversation with AI examiner</p>
              </div>

              <div className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {conversationItems.length === 0 ? (
                  <p className="self-center rounded-2xl bg-white/80 px-5 py-3 text-base text-[#5b6e8f]">
                    Waiting for the first examiner question...
                  </p>
                ) : (
                  conversationItems.slice(-8).map((line) => {
                    const isUser = line.role === "user";
                    return (
                      <div key={line.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-3xl px-4 py-3 text-base leading-7 sm:text-lg sm:leading-8 ${
                            isUser
                              ? "bg-[#0d3f79] text-white shadow-[0_10px_22px_rgba(13,63,121,0.25)]"
                              : "bg-white text-[#123f73] shadow-[0_8px_18px_rgba(25,28,30,0.10)]"
                          }`}
                        >
                          {isUser ? (
                            line.audioUrl ? (
                              <audio controls src={line.audioUrl} className="h-10 w-full min-w-[220px]" />
                            ) : (
                              <span className="text-sm text-white/85">Recording...</span>
                            )
                          ) : (
                            line.text
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={transcriptEndRef} />
              </div>

              <div className="mt-5 space-y-2 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7a8aa8]">Capturing audio</p>
                <div className="mx-auto flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                    <span
                      key={bar}
                      className={`block w-1.5 rounded-full bg-[#0d3f79]/70 ${isMicOn ? "animate-pulse" : ""}`}
                      style={{ height: `${(bar % 3) * 5 + 6}px`, animationDelay: `${bar * 60}ms` }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={`size-12 rounded-full ${isMicOn ? "border-emerald-300 text-emerald-700" : ""}`}
                  disabled={!isConnected}
                  onClick={() => void (isMicOn ? stopMic() : startMic())}
                >
                  <Microphone size={18} weight="fill" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full px-5 text-[#0d3f79]"
                  disabled={isConnected || isConnecting}
                  onClick={() => void connectSession()}
                >
                  {isConnecting ? "Connecting..." : "Reconnect"}
                </Button>
                <Button
                  type="button"
                  className="h-12 rounded-full bg-[#0d3f79] px-5 text-white hover:bg-[#0b3566]"
                  disabled={!isConnected}
                  onClick={disconnectSession}
                >
                  <PhoneDisconnect size={18} weight="bold" />
                  <span>End Session</span>
                </Button>
              </div>

              {speakingTurns.length > 0 ? (
                <p className="mt-3 text-center text-xs text-[#7a8aa8]">
                  Session turns: {speakingTurns.length}
                </p>
              ) : null}
            </Card>
          )}
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
        {content}
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
          "--sidebar-width-icon": "64px",
        } as CSSProperties
      }
      className="h-full"
    >
      <div className="flex h-full flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar />

        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
          {content}
        </main>
      </div>
    </SidebarProvider>
  );
}
