"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Microphone,
  PhoneDisconnect,
  PlayCircle,
  RadioButton,
  Sparkle,
} from "@phosphor-icons/react";
import { GoogleGenAI, Modality } from "@google/genai";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";

type SpeakingLevel = "beginner" | "intermediate" | "advanced";

type TranscriptItem = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts: number;
};

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

export default function SpeakingRoomScreen() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<SpeakingLevel>("intermediate");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  const sessionRef = useRef<Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null>(null);
  const isClosingRef = useRef(false);
  const isSessionReadyRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playheadRef = useRef(0);
  const assistantTurnIdRef = useRef<string | null>(null);
  const userTurnIdRef = useRef<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const sessionStatus = useMemo(() => {
    if (isConnecting) return "Connecting";
    if (isConnected && isMicOn) return "Live (mic on)";
    if (isConnected) return "Connected";
    return "Idle";
  }, [isConnecting, isConnected, isMicOn]);

  const mascotMessage = useMemo(() => {
    if (isConnecting) return "Connecting to Gemini Live room...";
    if (!isConnected) return "I am ready. Connect room and we start speaking.";
    if (isMicOn) return "Great. I can hear you. Let us practice naturally.";
    return "Room connected. Turn on your mic when you are ready.";
  }, [isConnecting, isConnected, isMicOn]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      setTranscript((prev) => [...prev, { id, role, text: chunk, ts: Date.now() }]);
    }
  };

  const sealTurns = () => {
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

  const disconnectSession = () => {
    isClosingRef.current = true;
    isSessionReadyRef.current = false;
    stopMic();
    sessionRef.current?.close();
    sessionRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
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
        body: JSON.stringify({ level, topic: topic.trim() || undefined }),
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
    } catch (error) {
      isSessionReadyRef.current = false;
      setIsConnecting(false);
      setIsConnected(false);
      toast.error(error instanceof Error ? error.message : "Unable to connect.");
    }
  };

  const sendKickoff = () => {
    if (!sessionRef.current) return;
    const prompt = [
      `Start IELTS speaking practice at ${level} level.`,
      `Topic focus: ${topic.trim() || "random IELTS topic"}.`,
      "Ask the first question now.",
    ].join("\n");
    sessionRef.current.sendRealtimeInput({ text: prompt });
  };

  useEffect(() => {
    return () => {
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

        <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <Card className="relative overflow-hidden rounded-3xl border-outline-variant/30 bg-linear-to-br from-[#e9f8ff] via-surface-container-lowest to-[#f3fbf6] p-6">
                <div className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary-container/60 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#ffe08a]/55 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Sparkle size={18} weight="bold" className="text-primary" />
                    <p className="text-sm font-semibold text-on-surface">Virtual Speaking Room</p>
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
                    AI Examiner Room
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Practice IELTS speaking in realtime with your AI mascot examiner.
                  </p>

                  <div className="mt-5 flex items-center gap-4 rounded-2xl border border-outline-variant/30 bg-white/85 p-4">
                    <div className="relative">
                      <div className={`absolute inset-0 rounded-full ${isConnected ? "animate-ping bg-primary/30" : "bg-transparent"}`} />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-outline-variant/30 bg-white">
                        <Image src="/logo.png" alt="AI Mascot" width={48} height={48} className="rounded-full" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                        IELTS Scholar Mascot
                      </p>
                      <p className="mt-1 text-sm leading-6 text-on-surface">{mascotMessage}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-outline-variant/40 bg-white">
                      Status: {sessionStatus}
                    </Badge>
                    <Badge variant="outline" className={`bg-white ${isMicOn ? "border-emerald-300 text-emerald-700" : "border-outline-variant/40"}`}>
                      Mic: {isMicOn ? "On" : "Off"}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
                <p className="mb-3 text-sm font-semibold text-on-surface">Room Controls</p>

                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-on-surface-variant">Level</p>
                    <Select value={level} onValueChange={(v) => setLevel(v as SpeakingLevel)}>
                      <SelectTrigger className="h-11 rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-on-surface-variant">Topic (optional)</p>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. technology, education, environment"
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {!isConnected ? (
                    <Button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => void connectSession()}
                      className="rounded-xl bg-primary text-white hover:bg-primary-fixed-variant"
                    >
                      <RadioButton size={15} weight="fill" />
                      {isConnecting ? "Connecting..." : "Enter Room"}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" className="rounded-xl" onClick={disconnectSession}>
                      <PhoneDisconnect size={16} weight="bold" />
                      Leave Room
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className={`rounded-xl ${isMicOn ? "border-emerald-300 text-emerald-700" : ""}`}
                    disabled={!isConnected}
                    onClick={() => void (isMicOn ? stopMic() : startMic())}
                  >
                    <Microphone size={16} weight="bold" />
                    {isMicOn ? "Mute Mic" : "Unmute Mic"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={!isConnected}
                    onClick={sendKickoff}
                  >
                    <PlayCircle size={16} weight="bold" />
                    New Question
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="flex flex-col rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="shrink-0 text-sm font-semibold text-on-surface">Conversation</p>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className={`size-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {isConnected ? "Live" : "Offline"}
                </div>
              </div>
              <div className="flex max-h-[70vh] min-h-[200px] flex-col gap-2 overflow-y-auto pr-1">
                {transcript.length === 0 ? (
                  <div className="my-auto rounded-2xl border border-dashed border-outline-variant/40 bg-white/70 px-4 py-8 text-center">
                    <p className="text-sm text-on-surface-variant">
                      Enter the room to start a realtime voice conversation.
                    </p>
                  </div>
                ) : null}

                {transcript.map((line) => {
                  if (line.role === "system") {
                    return (
                      <p key={line.id} className="text-center text-[11px] text-on-surface-variant/60">
                        {line.text}
                      </p>
                    );
                  }
                  const isUser = line.role === "user";
                  return (
                    <div key={line.id} className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
                      <span className="px-1 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50">
                        {isUser ? "You" : "Examiner"}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                          isUser
                            ? "rounded-tr-sm bg-primary text-white"
                            : "rounded-tl-sm bg-primary-container/60 text-on-surface"
                        }`}
                      >
                        {line.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
