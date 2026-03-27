"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CursorText,
  Lightbulb,
  Target,
  TrendUp,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Highlighter } from "@/components/ui/highlighter";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserQuery } from "@/hooks/api/use-auth";

type ExerciseType = "sentence-translation" | "topic-writing";
type Difficulty = "beginner" | "intermediate" | "advanced";
type ScreenMode = "setup" | "exercise";

type SentenceTranslationPractice = {
  mode: "sentence-translation";
  title: string;
  paragraph: string;
  sentences: string[];
  tips: string[];
};

type TopicWritingPractice = {
  mode: "topic-writing";
  title: string;
  description: string;
  bulletPoints: string[];
  tips: string[];
};

type GeneratedPractice = SentenceTranslationPractice | TopicWritingPractice;

type SentenceFeedback = {
  correctedTranslation: string;
  accuracy: number;
  bandScore: number;
  strengths: string[];
  improvements: string[];
  briefExplanation: string;
};

type TopicFeedback = {
  accuracy: number;
  bandScore: number;
  strengths: string[];
  improvements: string[];
  improvedDraft: string;
  briefExplanation: string;
};

type SentenceAttempt = {
  sourceSentence: string;
  userTranslation: string;
  feedback: SentenceFeedback;
};

const DEFAULT_LANGUAGE_OPTIONS = [
  "Vietnamese",
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Chinese",
  "Japanese",
  "Korean",
  "Thai",
  "Indonesian",
];

function getErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const maybeError = (payload as { error?: unknown }).error;
  return typeof maybeError === "string" ? maybeError : null;
}

function isGeneratedPractice(payload: unknown): payload is GeneratedPractice {
  if (typeof payload !== "object" || payload === null) return false;
  const item = payload as Partial<GeneratedPractice>;
  return item.mode === "sentence-translation" || item.mode === "topic-writing";
}

function isSentenceFeedback(payload: unknown): payload is SentenceFeedback {
  if (typeof payload !== "object" || payload === null) return false;
  const item = payload as Partial<SentenceFeedback>;
  return (
    typeof item.correctedTranslation === "string" &&
    typeof item.accuracy === "number" &&
    typeof item.bandScore === "number" &&
    Array.isArray(item.strengths) &&
    Array.isArray(item.improvements) &&
    typeof item.briefExplanation === "string"
  );
}

function isTopicFeedback(payload: unknown): payload is TopicFeedback {
  if (typeof payload !== "object" || payload === null) return false;
  const item = payload as Partial<TopicFeedback>;
  return (
    typeof item.accuracy === "number" &&
    typeof item.bandScore === "number" &&
    Array.isArray(item.strengths) &&
    Array.isArray(item.improvements) &&
    typeof item.improvedDraft === "string" &&
    typeof item.briefExplanation === "string"
  );
}

function accuracyTone(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-100 border-emerald-200";
  if (score >= 70) return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-rose-700 bg-rose-100 border-rose-200";
}

export default function WritingPracticeScreen() {
  const { data: currentUserResponse } = useCurrentUserQuery();

  const [screen, setScreen] = useState<ScreenMode>("setup");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("sentence-translation");
  const [nativeLanguage, setNativeLanguage] = useState("Vietnamese");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [topicName, setTopicName] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [practice, setPractice] = useState<GeneratedPractice | null>(null);

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<Record<number, SentenceAttempt>>({});
  const [evaluateLoading, setEvaluateLoading] = useState(false);

  const [topicWritingDraft, setTopicWritingDraft] = useState("");
  const [topicFeedback, setTopicFeedback] = useState<TopicFeedback | null>(null);
  const [topicEvaluateLoading, setTopicEvaluateLoading] = useState(false);

  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const topicDraftRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const user = currentUserResponse?.success ? currentUserResponse.data.user : null;
    if (user?.nativeLanguage) {
      setNativeLanguage(user.nativeLanguage);
    }
  }, [currentUserResponse]);

  const languageOptions = useMemo(() => {
    const fromProfile = nativeLanguage?.trim();
    return Array.from(
      new Set(
        [...DEFAULT_LANGUAGE_OPTIONS, ...(fromProfile ? [fromProfile] : [])].filter(Boolean)
      )
    );
  }, [nativeLanguage]);

  const sentencePractice =
    practice && practice.mode === "sentence-translation" ? practice : null;
  const topicPractice = practice && practice.mode === "topic-writing" ? practice : null;

  const completedCount = useMemo(() => Object.keys(attempts).length, [attempts]);

  const progressPercent = useMemo(() => {
    if (!sentencePractice || sentencePractice.sentences.length === 0) return 0;
    return Math.round((completedCount / sentencePractice.sentences.length) * 100);
  }, [completedCount, sentencePractice]);

  const averageAccuracy = useMemo(() => {
    const values = Object.values(attempts).map((item) => item.feedback.accuracy);
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, score) => sum + score, 0) / values.length);
  }, [attempts]);

  const currentSentence = sentencePractice?.sentences[currentSentenceIndex] ?? "";
  const currentAttempt = attempts[currentSentenceIndex] ?? null;

  const historyEntries = useMemo(
    () =>
      Object.entries(attempts)
        .map(([index, attempt]) => ({ index: Number(index), attempt }))
        .sort((a, b) => a.index - b.index),
    [attempts]
  );

  useEffect(() => {
    if (screen !== "exercise") return;
    if (sentencePractice) {
      answerRef.current?.focus();
      return;
    }
    if (topicPractice) {
      topicDraftRef.current?.focus();
    }
  }, [screen, sentencePractice, topicPractice, currentSentenceIndex]);

  const resetExerciseStates = () => {
    setCurrentSentenceIndex(0);
    setAnswer("");
    setAttempts({});
    setTopicWritingDraft("");
    setTopicFeedback(null);
  };

  const handleGenerate = async () => {
    setGenerateLoading(true);

    try {
      const response = await fetch("/api/writing-practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType,
          nativeLanguage,
          level: difficulty,
          topic: topicName.trim() || undefined,
        }),
      });

      const json: unknown = await response.json();
      const errorMessage = getErrorMessage(json);
      if (!response.ok || errorMessage || !isGeneratedPractice(json)) {
        toast.error(errorMessage ?? "Failed to generate practice.");
        return;
      }

      setPractice(json);
      resetExerciseStates();
      setScreen("exercise");
      toast.success("Practice generated.");
    } catch {
      toast.error("Failed to generate practice.");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleSubmitSentence = async () => {
    if (!sentencePractice) return;

    const userTranslation = answer.trim();
    if (!userTranslation) {
      toast.error("Please enter your translation first.");
      return;
    }

    setEvaluateLoading(true);

    try {
      const response = await fetch("/api/writing-practice/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSentence: currentSentence,
          userTranslation,
          nativeLanguage,
        }),
      });

      const json: unknown = await response.json();
      const errorMessage = getErrorMessage(json);
      if (!response.ok || errorMessage || !isSentenceFeedback(json)) {
        toast.error(errorMessage ?? "Failed to evaluate sentence.");
        return;
      }

      setAttempts((prev) => ({
        ...prev,
        [currentSentenceIndex]: {
          sourceSentence: currentSentence,
          userTranslation,
          feedback: json,
        },
      }));

      if (currentSentenceIndex < sentencePractice.sentences.length - 1) {
        setCurrentSentenceIndex((prev) => prev + 1);
        setAnswer("");
      } else {
        toast.success("All sentences completed.");
      }
    } catch {
      toast.error("Failed to evaluate sentence.");
    } finally {
      setEvaluateLoading(false);
    }
  };

  const handleEvaluateTopicDraft = async () => {
    if (!topicPractice) return;
    const draft = topicWritingDraft.trim();
    if (draft.length < 20) {
      toast.error("Please write a longer draft before submitting.");
      return;
    }

    setTopicEvaluateLoading(true);

    try {
      const response = await fetch("/api/writing-practice/evaluate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: topicPractice.title,
          topicDescription: topicPractice.description,
          userWriting: draft,
        }),
      });

      const json: unknown = await response.json();
      const errorMessage = getErrorMessage(json);
      if (!response.ok || errorMessage || !isTopicFeedback(json)) {
        toast.error(errorMessage ?? "Failed to evaluate writing draft.");
        return;
      }

      setTopicFeedback(json);
      toast.success("Draft evaluated.");
    } catch {
      toast.error("Failed to evaluate writing draft.");
    } finally {
      setTopicEvaluateLoading(false);
    }
  };

  const jumpToSentence = (index: number) => {
    setCurrentSentenceIndex(index);
    setAnswer(attempts[index]?.userTranslation ?? "");
  };

  const handleAnswerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmitSentence();
    }
  };

  const handleBackToSetup = () => {
    setScreen("setup");
  };

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
          {screen === "setup" ? (
            <div className="mx-auto w-full max-w-5xl space-y-5">
              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Writing Tools</p>
                <h1 className="mt-2 text-3xl font-semibold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
                  <Highlighter action="underline" color="#ffe08a" animationDuration={650} isView>
                    Configure Your Practice
                  </Highlighter>
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Choose exercise type, language, and difficulty. Topic is optional. If empty, AI picks a random IELTS topic.
                </p>
              </Card>

              <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                <p className="mb-3 text-sm font-semibold text-on-surface">Exercise Type</p>
                <Tabs value={exerciseType} onValueChange={(value) => setExerciseType(value as ExerciseType)}>
                  <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-transparent p-0 md:grid-cols-2">
                    <TabsTrigger
                      value="sentence-translation"
                      className="h-auto rounded-2xl border border-outline-variant/35 bg-white px-4 py-3 text-left data-[state=active]:border-primary/35 data-[state=active]:bg-primary-container/40"
                    >
                      <div className="w-full text-left">
                        <p className="text-sm font-semibold text-on-surface">Sentence Translation</p>
                        <p className="text-xs text-on-surface-variant">Generate a paragraph and translate sentence by sentence.</p>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="topic-writing"
                      className="h-auto rounded-2xl border border-outline-variant/35 bg-white px-4 py-3 text-left data-[state=active]:border-primary/35 data-[state=active]:bg-primary-container/40"
                    >
                      <div className="w-full text-left">
                        <p className="text-sm font-semibold text-on-surface">Topic Writing</p>
                        <p className="text-xs text-on-surface-variant">Generate a prompt and write your own response.</p>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-on-surface-variant">Language</p>
                    <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                      <SelectTrigger className="h-11 rounded-xl border-outline-variant/45 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-on-surface-variant">Difficulty</p>
                    <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
                      <SelectTrigger className="h-11 rounded-xl border-outline-variant/45 bg-white">
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
                    <p className="mb-1 text-xs font-medium text-on-surface-variant">Topic (Optional)</p>
                    <Input
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      placeholder="Leave blank for random IELTS topic"
                      className="h-11 rounded-xl border-outline-variant/45 bg-white"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button
                    type="button"
                    disabled={generateLoading}
                    onClick={() => void handleGenerate()}
                    className="h-11 rounded-xl bg-primary px-6 text-white hover:bg-primary-fixed-variant"
                  >
                    {generateLoading ? "Generating..." : "Generate Exercise"}
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}

          {screen === "exercise" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={handleBackToSetup}>
                    <ArrowLeft size={16} weight="bold" />
                    Back to Config
                  </Button>
                  <Badge variant="outline" className="border-outline-variant/40 bg-white">
                    {practice?.mode === "sentence-translation" ? "Sentence Translation" : "Topic Writing"}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void handleGenerate()}
                  disabled={generateLoading}
                >
                  {generateLoading ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>

              {sentencePractice ? (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-on-surface">Paragraph</p>
                        <Badge variant="outline" className="border-outline-variant/40 bg-white">
                          {completedCount}/{sentencePractice.sentences.length} complete
                        </Badge>
                      </div>

                      <p className="mb-3 text-lg font-semibold text-on-surface">{sentencePractice.title}</p>
                      <p className="rounded-2xl border border-outline-variant/30 bg-white p-4 text-[15px] leading-8 text-on-surface-variant">
                        {sentencePractice.sentences.map((sentence, index) => {
                          const isCurrent = index === currentSentenceIndex;
                          const isDone = Boolean(attempts[index]);
                          return (
                            <span
                              key={`${index}-${sentence}`}
                              onClick={() => jumpToSentence(index)}
                              className={`mr-1 cursor-pointer rounded-md px-1.5 py-0.5 transition-colors ${
                                isCurrent
                                  ? "bg-primary-container text-on-surface ring-1 ring-primary/25"
                                  : isDone
                                    ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/50"
                                    : "bg-transparent hover:bg-surface-container-low/70"
                              }`}
                            >
                              {sentence}
                            </span>
                          );
                        })}
                      </p>

                      {sentencePractice.tips.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                          <div className="mb-1 flex items-center gap-2">
                            <Lightbulb size={15} weight="fill" className="text-primary" />
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Tips</p>
                          </div>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                            {sentencePractice.tips.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </Card>

                    {historyEntries.length > 0 ? (
                      <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                        <p className="mb-3 text-sm font-semibold text-on-surface">History</p>
                        <div className="space-y-3">
                          {historyEntries.map(({ index, attempt }) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => jumpToSentence(index)}
                              className="w-full rounded-2xl border border-outline-variant/25 bg-white p-3 text-left transition hover:bg-surface-container-low/60"
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <p className="text-sm font-semibold text-on-surface">Sentence {index + 1}</p>
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${accuracyTone(attempt.feedback.accuracy)}`}>
                                  {attempt.feedback.accuracy}%
                                </span>
                              </div>
                              <p className="line-clamp-1 text-xs text-on-surface-variant">{attempt.userTranslation}</p>
                            </button>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                  </div>

                  <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                    <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CursorText size={18} weight="bold" className="text-primary" />
                          <p className="text-sm font-semibold text-on-surface">Translate</p>
                        </div>
                        <Badge variant="outline" className="border-outline-variant/40 bg-white">
                          {currentSentenceIndex + 1}/{sentencePractice.sentences.length}
                        </Badge>
                      </div>

                      <p className="mb-2 rounded-xl bg-surface-container-low px-3 py-2 text-sm leading-6 text-on-surface">{currentSentence}</p>

                      <Textarea
                        ref={answerRef}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={handleAnswerKeyDown}
                        rows={6}
                        disabled={evaluateLoading}
                        placeholder="Type your English translation..."
                        className="min-h-[160px] rounded-xl border-outline-variant/45 bg-white"
                      />

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-xs text-on-surface-variant">Cmd/Ctrl + Enter to submit</p>
                        <Button
                          type="button"
                          onClick={() => void handleSubmitSentence()}
                          disabled={evaluateLoading}
                          className="rounded-xl bg-primary px-4 text-white hover:bg-primary-fixed-variant"
                        >
                          {evaluateLoading ? "Scoring..." : "Submit"}
                        </Button>
                      </div>
                    </Card>

                    <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target size={18} weight="bold" className="text-primary" />
                          <p className="text-sm font-semibold text-on-surface">Progress</p>
                        </div>
                        <span className="text-sm font-semibold text-on-surface">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                      {averageAccuracy !== null ? (
                        <p className="mt-2 text-sm text-on-surface-variant">Average accuracy: {averageAccuracy}%</p>
                      ) : null}
                    </Card>

                    {currentAttempt ? (
                      <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-on-surface">Feedback</p>
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${accuracyTone(currentAttempt.feedback.accuracy)}`}>
                            {currentAttempt.feedback.accuracy}%
                          </span>
                        </div>
                        <p className="mb-2 text-xs text-on-surface-variant">Band {currentAttempt.feedback.bandScore.toFixed(1)}</p>
                        <p className="rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface">{currentAttempt.feedback.correctedTranslation}</p>
                        <p className="mt-2 text-sm text-on-surface-variant">{currentAttempt.feedback.briefExplanation}</p>
                      </Card>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {topicPractice ? (
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Writing Topic</p>
                    <h2 className="mt-1 text-2xl font-semibold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
                      {topicPractice.title}
                    </h2>
                    <p className="mt-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
                      {topicPractice.description}
                    </p>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-on-surface">What to cover</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-on-surface-variant">
                        {topicPractice.bulletPoints.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    {topicPractice.tips.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <Lightbulb size={15} weight="fill" className="text-primary" />
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Tips</p>
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                          {topicPractice.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </Card>

                  <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                    <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                      <div className="mb-2 flex items-center gap-2">
                        <CursorText size={18} weight="bold" className="text-primary" />
                        <p className="text-sm font-semibold text-on-surface">Your Draft</p>
                      </div>
                      <Textarea
                        ref={topicDraftRef}
                        value={topicWritingDraft}
                        onChange={(e) => setTopicWritingDraft(e.target.value)}
                        rows={12}
                        placeholder="Write your response here..."
                        className="min-h-[280px] rounded-xl border-outline-variant/45 bg-white"
                        disabled={topicEvaluateLoading}
                      />
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          onClick={() => void handleEvaluateTopicDraft()}
                          disabled={topicEvaluateLoading}
                          className="rounded-xl bg-primary px-4 text-white hover:bg-primary-fixed-variant"
                        >
                          {topicEvaluateLoading ? "Evaluating..." : "Evaluate Draft"}
                        </Button>
                      </div>
                    </Card>

                    {topicFeedback ? (
                      <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendUp size={17} weight="bold" className="text-primary" />
                            <p className="text-sm font-semibold text-on-surface">AI Feedback</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${accuracyTone(topicFeedback.accuracy)}`}>
                            {topicFeedback.accuracy}%
                          </span>
                        </div>

                        <p className="mb-2 text-xs text-on-surface-variant">Band {topicFeedback.bandScore.toFixed(1)}</p>
                        <p className="mb-2 rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">{topicFeedback.briefExplanation}</p>

                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Improvements</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-on-surface-variant marker:text-amber-600">
                          {topicFeedback.improvements.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>

                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Improved Draft</p>
                        <p className="mt-1 rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface">
                          {topicFeedback.improvedDraft}
                        </p>
                      </Card>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </SidebarProvider>
  );
}
