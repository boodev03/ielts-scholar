"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import { Microphone, Play, Sparkle, Waveform } from "@phosphor-icons/react";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "shadow" | "word";
type Level = "beginner" | "intermediate" | "advanced";

type ShadowSet = {
  topic: string;
  coachingGoal: string;
  sentences: string[];
};

type ShadowFeedback = {
  timing: number;
  intonation: number;
  stress: number;
  clarity: number;
  overall: number;
  mistakes: string[];
  retryChunk: string;
  drillTip: string;
};

type WordItem = {
  word: string;
  ipa: string;
  meaning: string;
  example: string;
  mouthTip: string;
  minimalPair: string;
};

type WordSet = {
  title: string;
  words: WordItem[];
};

type WordFeedback = {
  pronunciationAccuracy: number;
  stressAccuracy: number;
  feedback: string;
  correction: string;
  nextDrill: string;
};

type Recognition = {
  start: () => void;
  stop: () => void;
  onresult: ((e: Event & { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}

function createRecognition() {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

function buildBars(samples: number[]) {
  if (samples.length === 0) return Array.from({ length: 32 }, () => 8);
  const chunk = Math.max(1, Math.floor(samples.length / 32));
  const bars: number[] = [];
  for (let i = 0; i < samples.length; i += chunk) {
    const slice = samples.slice(i, i + chunk);
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    bars.push(Math.max(6, Math.min(28, Math.round(avg * 70))));
  }
  return bars.slice(0, 32);
}

export default function SpeakingPracticeLabScreen() {
  return <SpeakingPracticeLabScreenInner />;
}

type SpeakingPracticeLabScreenProps = {
  embedded?: boolean;
};

export function SpeakingPracticeLabScreenInner({
  embedded = false,
}: SpeakingPracticeLabScreenProps = {}) {
  const [mode, setMode] = useState<Mode>("shadow");
  const [level, setLevel] = useState<Level>("intermediate");
  const [topic, setTopic] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionText, setRecognitionText] = useState("");

  const [shadowSet, setShadowSet] = useState<ShadowSet | null>(null);
  const [shadowIndex, setShadowIndex] = useState(0);
  const [shadowFeedback, setShadowFeedback] = useState<ShadowFeedback | null>(null);
  const [shadowHistory, setShadowHistory] = useState<ShadowFeedback[]>([]);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [shadowEvalLoading, setShadowEvalLoading] = useState(false);

  const [wordSet, setWordSet] = useState<WordSet | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordFeedback, setWordFeedback] = useState<WordFeedback | null>(null);
  const [wordHistory, setWordHistory] = useState<WordFeedback[]>([]);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordEvalLoading, setWordEvalLoading] = useState(false);

  const recognitionRef = useRef<Recognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const waveSamplesRef = useRef<number[]>([]);
  const [waveBars, setWaveBars] = useState<number[]>([]);
  const speechStartRef = useRef<number | null>(null);
  const speechDurationRef = useRef<number>(0);

  const currentShadowSentence = shadowSet?.sentences[shadowIndex] ?? "";
  const currentWord = wordSet?.words[wordIndex] ?? null;

  const shadowAverage = useMemo(() => {
    if (shadowHistory.length === 0) return null;
    return Math.round(shadowHistory.reduce((sum, item) => sum + item.overall, 0) / shadowHistory.length);
  }, [shadowHistory]);

  const wordAverage = useMemo(() => {
    if (wordHistory.length === 0) return null;
    return Math.round(
      wordHistory.reduce((sum, item) => sum + item.pronunciationAccuracy, 0) / wordHistory.length
    );
  }, [wordHistory]);

  const stopMicCapture = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const startMicCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(1024, 1, 1);
    processorRef.current = processor;
    waveSamplesRef.current = [];

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i += 1) {
        sum += Math.abs(input[i] ?? 0);
      }
      waveSamplesRef.current.push(sum / input.length);
      if (waveSamplesRef.current.length % 8 === 0) {
        setWaveBars(buildBars(waveSamplesRef.current));
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  };

  const startRecognition = async () => {
    const recognition = createRecognition();
    if (!recognition) {
      toast.error("Speech Recognition is not supported in this browser.");
      return;
    }

    setRecognitionText("");
    setWaveBars([]);
    speechStartRef.current = Date.now();
    speechDurationRef.current = 0;
    await startMicCapture().catch(() => toast.error("Microphone permission denied."));

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += `${event.results[i][0]?.transcript ?? ""} `;
      }
      setRecognitionText(transcript.trim());
    };
    recognition.onerror = (event) => {
      if (event.error && event.error !== "no-speech") {
        toast.error(`Recognition error: ${event.error}`);
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      stopMicCapture();
      if (speechStartRef.current) {
        speechDurationRef.current = Date.now() - speechStartRef.current;
      }
      setWaveBars(buildBars(waveSamplesRef.current));
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopMicCapture();
    setIsRecording(false);
    if (speechStartRef.current) {
      speechDurationRef.current = Date.now() - speechStartRef.current;
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const generateShadowSet = async () => {
    setShadowLoading(true);
    try {
      const res = await fetch("/api/speaking/shadow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, topic: topic.trim() || undefined }),
      });
      const json = (await res.json()) as ShadowSet & { error?: string };
      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to generate shadow set.");
        return;
      }
      setShadowSet(json);
      setShadowIndex(0);
      setShadowFeedback(null);
      setShadowHistory([]);
      setRecognitionText("");
      toast.success("Shadow learning set ready.");
    } catch {
      toast.error("Failed to generate shadow set.");
    } finally {
      setShadowLoading(false);
    }
  };

  const evaluateShadow = async () => {
    if (!currentShadowSentence || !recognitionText.trim()) {
      toast.error("Please record your repetition first.");
      return;
    }

    setShadowEvalLoading(true);
    try {
      const targetDurationMs = Math.max(800, currentShadowSentence.split(" ").length * 420);
      const res = await fetch("/api/speaking/shadow/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSentence: currentShadowSentence,
          userTranscript: recognitionText.trim(),
          userDurationMs: speechDurationRef.current,
          targetDurationMs,
        }),
      });
      const json = (await res.json()) as ShadowFeedback & { error?: string };
      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to evaluate shadow attempt.");
        return;
      }
      setShadowFeedback(json);
      setShadowHistory((prev) => [json, ...prev].slice(0, 20));
      await fetch("/api/writing-practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseMode: "speaking-live",
          accuracy: json.overall,
          bandScore: Number((1 + (json.overall / 100) * 8).toFixed(1)),
          criteria: [
            {
              key: "shadow_timing",
              label: "Shadow Timing",
              score: json.timing,
              weight: 0.25,
              comment: json.drillTip,
            },
            {
              key: "shadow_intonation",
              label: "Shadow Intonation",
              score: json.intonation,
              weight: 0.25,
              comment: json.drillTip,
            },
            {
              key: "shadow_stress",
              label: "Shadow Stress",
              score: json.stress,
              weight: 0.2,
              comment: json.retryChunk,
            },
            {
              key: "shadow_clarity",
              label: "Shadow Clarity",
              score: json.clarity,
              weight: 0.3,
              comment: json.mistakes.join("; ") || "Keep shadowing consistently.",
            },
          ],
          meta: {
            subtype: "shadow-learning",
            targetSentence: currentShadowSentence,
            userTranscript: recognitionText.trim(),
          },
        }),
      });
    } catch {
      toast.error("Failed to evaluate shadow attempt.");
    } finally {
      setShadowEvalLoading(false);
    }
  };

  const generateWordSet = async () => {
    setWordLoading(true);
    try {
      const res = await fetch("/api/speaking/word-practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, topic: topic.trim() || undefined }),
      });
      const json = (await res.json()) as WordSet & { error?: string };
      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to generate word set.");
        return;
      }
      setWordSet({ ...json, words: json.words.slice(0, 10) });
      setWordIndex(0);
      setWordFeedback(null);
      setWordHistory([]);
      setRecognitionText("");
      toast.success("Word practice set ready.");
    } catch {
      toast.error("Failed to generate word set.");
    } finally {
      setWordLoading(false);
    }
  };

  const evaluateWord = async () => {
    if (!currentWord || !recognitionText.trim()) {
      toast.error("Please pronounce the word first.");
      return;
    }
    setWordEvalLoading(true);
    try {
      const res = await fetch("/api/speaking/word-practice/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: currentWord.word,
          minimalPair: currentWord.minimalPair,
          userTranscript: recognitionText.trim(),
        }),
      });
      const json = (await res.json()) as WordFeedback & { error?: string };
      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to evaluate pronunciation.");
        return;
      }
      setWordFeedback(json);
      setWordHistory((prev) => [json, ...prev].slice(0, 30));
      await fetch("/api/writing-practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseMode: "speaking-live",
          accuracy: Math.round(json.pronunciationAccuracy * 0.7 + json.stressAccuracy * 0.3),
          bandScore: Number((1 + ((json.pronunciationAccuracy * 0.7 + json.stressAccuracy * 0.3) / 100) * 8).toFixed(1)),
          criteria: [
            {
              key: "word_pronunciation",
              label: "Word Pronunciation",
              score: json.pronunciationAccuracy,
              weight: 0.7,
              comment: json.feedback,
            },
            {
              key: "word_stress",
              label: "Word Stress",
              score: json.stressAccuracy,
              weight: 0.3,
              comment: json.correction,
            },
          ],
          meta: {
            subtype: "word-practice",
            word: currentWord.word,
            minimalPair: currentWord.minimalPair,
            userTranscript: recognitionText.trim(),
          },
        }),
      });
    } catch {
      toast.error("Failed to evaluate pronunciation.");
    } finally {
      setWordEvalLoading(false);
    }
  };

  const nextShadowSentence = () => {
    if (!shadowSet) return;
    setShadowIndex((prev) => Math.min(prev + 1, shadowSet.sentences.length - 1));
    setRecognitionText("");
    setShadowFeedback(null);
  };

  const nextWord = () => {
    if (!wordSet) return;
    setWordIndex((prev) => Math.min(prev + 1, wordSet.words.length - 1));
    setRecognitionText("");
    setWordFeedback(null);
  };

  const content = (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="relative overflow-hidden rounded-3xl border-0 bg-[linear-gradient(125deg,#0b2f52_0%,#154f82_48%,#1e7f8f_100%)] p-6 text-white shadow-[0_18px_42px_rgba(9,27,53,0.35)] md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-[#8be4d2]/25 blur-2xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Speaking Practice</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Shadow Learning + Word Trainer
            </h1>
            <p className="mt-3 text-sm text-white/85 md:text-base">
              Build rhythm, stress, intonation, and precision with focused speaking drills.
            </p>
          </div>

          <div className="grid w-full max-w-sm grid-cols-3 gap-2 rounded-2xl border border-white/20 bg-white/8 p-3 text-center backdrop-blur-sm">
            <div className="rounded-xl bg-black/10 px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/70">Mode</p>
              <p className="mt-1 text-sm font-semibold">{mode === "shadow" ? "Shadow" : "Word"}</p>
            </div>
            <div className="rounded-xl bg-black/10 px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/70">Level</p>
              <p className="mt-1 text-sm font-semibold">{level}</p>
            </div>
            <div className="rounded-xl bg-black/10 px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/70">Recording</p>
              <p className="mt-1 text-sm font-semibold">{isRecording ? "Live" : "Idle"}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (optional): travel, environment, technology..."
            className="h-11 rounded-xl border-outline-variant/45 bg-white"
          />
          <Tabs value={level} onValueChange={(value) => setLevel(value as Level)}>
            <TabsList className="grid h-11 grid-cols-3 rounded-xl border border-outline-variant/35 bg-white p-1">
              <TabsTrigger value="beginner" className="rounded-lg text-xs md:text-sm">
                Beginner
              </TabsTrigger>
              <TabsTrigger value="intermediate" className="rounded-lg text-xs md:text-sm">
                Intermediate
              </TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-lg text-xs md:text-sm">
                Advanced
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <TabsList className="grid h-11 grid-cols-2 rounded-xl border border-outline-variant/35 bg-white p-1">
              <TabsTrigger value="shadow" className="rounded-lg">
                Shadow
              </TabsTrigger>
              <TabsTrigger value="word" className="rounded-lg">
                Word
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {mode === "shadow" ? (
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f7394]">Shadow Learning</p>
                <p className="mt-1 text-sm text-[#415576]">Repeat after AI and match rhythm and phrasing.</p>
              </div>
              <Button
                type="button"
                className="h-10 rounded-xl bg-[#113861] px-4 text-white hover:bg-[#0f3153]"
                onClick={() => void generateShadowSet()}
                disabled={shadowLoading}
              >
                <Sparkle size={16} weight="fill" />
                {shadowLoading ? "Generating..." : "Generate Set"}
              </Button>
            </div>

            {shadowSet ? (
              <>
                <div className="rounded-2xl border border-[#d6e2f2] bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-[#e8f1ff] text-[#1a4b87]">{shadowSet.topic}</Badge>
                    <Badge variant="outline" className="rounded-full border-[#c6d7ec] text-[#4a6287]">
                      Sentence {shadowIndex + 1}/{shadowSet.sentences.length}
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-[#587093]">{shadowSet.coachingGoal}</p>
                  <p className="rounded-xl border border-[#dce6f5] bg-[#f7fbff] px-4 py-3 text-lg leading-8 text-[#112f52]">
                    {currentShadowSentence}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => speakText(currentShadowSentence)}>
                    <Play size={16} weight="fill" />
                    Listen AI
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => void startRecognition()}
                    disabled={isRecording}
                  >
                    <Microphone size={16} weight="fill" />
                    Start Repeat
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={stopRecognition} disabled={!isRecording}>
                    Stop
                  </Button>
                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-[#123f73] text-white hover:bg-[#0f3560]"
                    onClick={() => void evaluateShadow()}
                    disabled={shadowEvalLoading}
                  >
                    {shadowEvalLoading ? "Scoring..." : "Score Attempt"}
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={nextShadowSentence}>
                    Next Sentence
                  </Button>
                </div>

                <div className="mt-4 rounded-2xl border border-[#d6e3f4] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Waveform size={16} weight="bold" className="text-[#124e8d]" />
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#60789b]">Speech Wave</p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-[#cedef1] text-[#4a6287]">
                      {isRecording ? "Recording" : "Captured"}
                    </Badge>
                  </div>
                  <div className="flex min-h-10 items-end gap-1 rounded-xl bg-[#f7fbff] px-2 py-2">
                    {waveBars.length > 0 ? (
                      waveBars.map((h, idx) => (
                        <span key={`${idx}-${h}`} className="w-1 rounded-full bg-[#1f67aa]" style={{ height: `${h}px` }} />
                      ))
                    ) : (
                      <span className="px-1 text-xs text-[#7c8ea8]">Waveform will appear after speaking.</span>
                    )}
                  </div>
                  <p className="mt-3 rounded-xl border border-[#e4edf9] bg-[#fbfdff] px-3 py-2 text-xs text-[#516a8d]">
                    Transcript: {recognitionText || "No transcript yet"}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cfe0f4] bg-[#f8fbff] px-4 py-8 text-center text-sm text-[#5f7394]">
                Generate a set to begin shadow training.
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#17375f]">Feedback</p>
              {shadowFeedback ? (
                <Badge className="rounded-full bg-emerald-100 text-emerald-700">Overall {shadowFeedback.overall}%</Badge>
              ) : null}
            </div>

            {shadowFeedback ? (
              <div className="space-y-3">
                {[
                  { label: "Timing", value: shadowFeedback.timing },
                  { label: "Intonation", value: shadowFeedback.intonation },
                  { label: "Stress", value: shadowFeedback.stress },
                  { label: "Clarity", value: shadowFeedback.clarity },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-[#17375f]">{item.label}</p>
                      <p className="text-xs text-[#6d83a3]">{item.value}%</p>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}

                <div className="space-y-2 rounded-2xl border border-[#d8e4f4] bg-white p-3">
                  <p className="text-xs text-[#4d668a]">Retry chunk: {shadowFeedback.retryChunk}</p>
                  <p className="text-xs text-[#4d668a]">Daily drill: {shadowFeedback.drillTip}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d3e2f2] bg-[#f8fbff] px-4 py-8 text-center text-sm text-[#5f7394]">
                Submit your repetition to see feedback.
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#d8e4f4] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#60789b]">Progress</p>
              <p className="mt-1 text-sm text-[#284770]">
                Attempts: {shadowHistory.length} {shadowAverage !== null ? `• Avg ${shadowAverage}%` : ""}
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f7394]">Word Trainer</p>
                <p className="mt-1 text-sm text-[#415576]">Practice one word at a time and fix stress patterns.</p>
              </div>
              <Button
                type="button"
                className="h-10 rounded-xl bg-[#113861] px-4 text-white hover:bg-[#0f3153]"
                onClick={() => void generateWordSet()}
                disabled={wordLoading}
              >
                <Sparkle size={16} weight="fill" />
                {wordLoading ? "Generating..." : "Generate Daily 10"}
              </Button>
            </div>

            {currentWord ? (
              <>
                <div className="rounded-2xl border border-[#d6e2f2] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-3xl font-semibold text-[#133c68]">{currentWord.word}</p>
                    {wordSet ? (
                      <Badge variant="outline" className="rounded-full border-[#c6d7ec] text-[#4a6287]">
                        Word {Math.min(wordIndex + 1, wordSet.words.length)}/{wordSet.words.length}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-[#5f7394]">{currentWord.ipa}</p>
                  <p className="mt-2 text-sm text-[#5f7394]">{currentWord.meaning}</p>
                  <p className="mt-2 text-sm text-[#1f3f67]">Example: {currentWord.example}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-[#d5e3f3] bg-[#f9fcff] text-[#486183]">
                      Mouth tip: {currentWord.mouthTip}
                    </Badge>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                      Minimal pair: {currentWord.minimalPair}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => speakText(currentWord.word)}>
                    <Play size={16} weight="fill" />
                    Listen Word
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => void startRecognition()}
                    disabled={isRecording}
                  >
                    <Microphone size={16} weight="fill" />
                    Pronounce
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={stopRecognition} disabled={!isRecording}>
                    Stop
                  </Button>
                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-[#123f73] text-white hover:bg-[#0f3560]"
                    onClick={() => void evaluateWord()}
                    disabled={wordEvalLoading}
                  >
                    {wordEvalLoading ? "Scoring..." : "Score Word"}
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={nextWord}>
                    Next Word
                  </Button>
                </div>

                <p className="mt-4 rounded-xl border border-[#deebf9] bg-white px-3 py-2 text-xs text-[#4d668a]">
                  Recognized: {recognitionText || "--"}
                </p>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cfe0f4] bg-[#f8fbff] px-4 py-8 text-center text-sm text-[#5f7394]">
                Generate your daily word set to start.
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 md:p-6">
            <p className="mb-3 text-sm font-semibold text-[#17375f]">Pronunciation Feedback</p>
            {wordFeedback ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs text-[#17375f]">Pronunciation</p>
                    <p className="text-xs text-[#6d83a3]">{wordFeedback.pronunciationAccuracy}%</p>
                  </div>
                  <Progress value={wordFeedback.pronunciationAccuracy} className="h-2" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs text-[#17375f]">Stress</p>
                    <p className="text-xs text-[#6d83a3]">{wordFeedback.stressAccuracy}%</p>
                  </div>
                  <Progress value={wordFeedback.stressAccuracy} className="h-2" />
                </div>
                <div className="space-y-2 rounded-2xl border border-[#d8e4f4] bg-white p-3">
                  <p className="text-xs text-[#4d668a]">{wordFeedback.feedback}</p>
                  <p className="text-xs text-[#4d668a]">Correction: {wordFeedback.correction}</p>
                  <p className="text-xs text-[#4d668a]">Drill: {wordFeedback.nextDrill}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d3e2f2] bg-[#f8fbff] px-4 py-8 text-center text-sm text-[#5f7394]">
                Submit a word attempt to see feedback.
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#d8e4f4] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#60789b]">Progress</p>
              <p className="mt-1 text-sm text-[#284770]">
                Completed: {wordHistory.length} {wordAverage !== null ? `• Avg ${wordAverage}%` : ""}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
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
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {content}
        </main>
      </div>
    </SidebarProvider>
  );
}
