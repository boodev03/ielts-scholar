"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import Sidebar from "@/app/layouts/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUserQuery } from "@/hooks/api/use-auth";
import type { CriterionScore, ExerciseMode } from "@/lib/writing/scoring";
import {
  SentenceExerciseSection,
  TopicExerciseSection,
  WritingSetupPanel,
} from "./WritingPracticeSections";

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
  criteria: CriterionScore[];
  focusAreas: string[];
  strengths: string[];
  improvements: string[];
  briefExplanation: string;
};

type TopicFeedback = {
  accuracy: number;
  bandScore: number;
  criteria: CriterionScore[];
  focusAreas: string[];
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

type LatestSentenceSubmission = {
  sentenceIndex: number;
  sourceSentence: string;
  userTranslation: string;
  feedback: SentenceFeedback;
};

type ProgressAttempt = {
  id: string;
  exercise_mode: ExerciseMode;
  overall_accuracy: number;
  band_score: number;
  criterion_scores: CriterionScore[];
  created_at: string;
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
    Array.isArray(item.criteria) &&
    Array.isArray(item.focusAreas) &&
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
    Array.isArray(item.criteria) &&
    Array.isArray(item.focusAreas) &&
    Array.isArray(item.strengths) &&
    Array.isArray(item.improvements) &&
    typeof item.improvedDraft === "string" &&
    typeof item.briefExplanation === "string"
  );
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
  const [latestSentenceSubmission, setLatestSentenceSubmission] =
    useState<LatestSentenceSubmission | null>(null);
  const [evaluateLoading, setEvaluateLoading] = useState(false);

  const [topicWritingDraft, setTopicWritingDraft] = useState("");
  const [topicFeedback, setTopicFeedback] = useState<TopicFeedback | null>(null);
  const [topicEvaluateLoading, setTopicEvaluateLoading] = useState(false);
  const [progressAttempts, setProgressAttempts] = useState<ProgressAttempt[]>([]);

  const answerRef = useRef<HTMLInputElement | null>(null);
  const topicDraftRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const user = currentUserResponse?.success ? currentUserResponse.data.user : null;
    if (user?.nativeLanguage) {
      setNativeLanguage(user.nativeLanguage);
    }
  }, [currentUserResponse]);

  const loadProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/writing-practice/progress", { method: "GET" });
      const json = (await response.json()) as {
        attempts?: ProgressAttempt[];
        error?: string;
      };
      if (!response.ok) {
        if (json.error) toast.error(json.error);
        return;
      }
      setProgressAttempts(json.attempts ?? []);
    } catch {
      toast.error("Failed to load progress dashboard.");
    }
  }, []);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

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

  const currentSentence = sentencePractice?.sentences[currentSentenceIndex] ?? "";
  const currentAttempt = attempts[currentSentenceIndex] ?? null;

  const historyEntries = useMemo(
    () =>
      Object.entries(attempts)
        .map(([index, attempt]) => ({ index: Number(index), attempt }))
        .sort((a, b) => a.index - b.index),
    [attempts]
  );

  const latestAttempts = useMemo(() => progressAttempts.slice(0, 20), [progressAttempts]);

  const criterionInsights = useMemo(() => {
    const bucket = new Map<string, { label: string; total: number; count: number }>();
    for (const attempt of latestAttempts) {
      for (const criterion of attempt.criterion_scores ?? []) {
        const current = bucket.get(criterion.key) ?? {
          label: criterion.label,
          total: 0,
          count: 0,
        };
        current.total += criterion.score;
        current.count += 1;
        bucket.set(criterion.key, current);
      }
    }
    return Array.from(bucket.entries())
      .map(([key, value]) => ({
        key,
        label: value.label,
        average: Math.round(value.total / value.count),
      }))
      .sort((a, b) => a.average - b.average);
  }, [latestAttempts]);

  const weakCriteria = useMemo(() => criterionInsights.slice(0, 3), [criterionInsights]);

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
    setLatestSentenceSubmission(null);
    setTopicWritingDraft("");
    setTopicFeedback(null);
  };

  const recordProgressAttempt = async (payload: {
    exerciseMode: ExerciseMode;
    accuracy: number;
    bandScore: number;
    criteria: CriterionScore[];
    meta?: Record<string, unknown>;
  }) => {
    try {
      const response = await fetch("/api/writing-practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        if (json.error) {
          toast.error(json.error);
        }
        return;
      }
      void loadProgress();
    } catch {
      toast.error("Failed to save progress snapshot.");
    }
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
          adaptiveContext: {
            weakCriteria: weakCriteria.map((item) => item.label),
          },
        }),
      });

      const json: unknown = await response.json();
      const errorMessage = getErrorMessage(json);
      if (!response.ok || errorMessage || !isSentenceFeedback(json)) {
        toast.error(errorMessage ?? "Failed to evaluate sentence.");
        return;
      }

      const submittedAttempt: SentenceAttempt = {
        sourceSentence: currentSentence,
        userTranslation,
        feedback: json,
      };
      setAttempts((prev) => ({
        ...prev,
        [currentSentenceIndex]: {
          ...submittedAttempt,
        },
      }));
      setLatestSentenceSubmission({
        sentenceIndex: currentSentenceIndex,
        ...submittedAttempt,
      });

      void recordProgressAttempt({
        exerciseMode: "sentence-translation",
        accuracy: json.accuracy,
        bandScore: json.bandScore,
        criteria: json.criteria,
        meta: {
          sourceSentence: currentSentence,
          userTranslation,
        },
      });

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
          adaptiveContext: {
            weakCriteria: weakCriteria.map((item) => item.label),
          },
        }),
      });

      const json: unknown = await response.json();
      const errorMessage = getErrorMessage(json);
      if (!response.ok || errorMessage || !isTopicFeedback(json)) {
        toast.error(errorMessage ?? "Failed to evaluate writing draft.");
        return;
      }

      setTopicFeedback(json);
      void recordProgressAttempt({
        exerciseMode: "topic-writing",
        accuracy: json.accuracy,
        bandScore: json.bandScore,
        criteria: json.criteria,
        meta: {
          topicTitle: topicPractice.title,
          writingLength: draft.length,
        },
      });
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

  const handleAnswerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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
            <WritingSetupPanel
              exerciseType={exerciseType}
              setExerciseType={setExerciseType}
              nativeLanguage={nativeLanguage}
              setNativeLanguage={setNativeLanguage}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              topicName={topicName}
              setTopicName={setTopicName}
              languageOptions={languageOptions}
              generateLoading={generateLoading}
              onGenerate={() => void handleGenerate()}
            />
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
                <SentenceExerciseSection
                  sentencePractice={sentencePractice}
                  attempts={attempts}
                  historyEntries={historyEntries}
                  currentSentenceIndex={currentSentenceIndex}
                  currentSentence={currentSentence}
                  nativeLanguage={nativeLanguage}
                  answer={answer}
                  evaluateLoading={evaluateLoading}
                  currentAttempt={currentAttempt}
                  answerRef={answerRef}
                  setAnswer={setAnswer}
                  jumpToSentence={jumpToSentence}
                  onAnswerKeyDown={handleAnswerKeyDown}
                  onSubmit={() => void handleSubmitSentence()}
                  latestSubmission={latestSentenceSubmission}
                />
              ) : null}

              {topicPractice ? (
                <TopicExerciseSection
                  topicPractice={topicPractice}
                  topicDraftRef={topicDraftRef}
                  topicWritingDraft={topicWritingDraft}
                  setTopicWritingDraft={setTopicWritingDraft}
                  topicEvaluateLoading={topicEvaluateLoading}
                  onEvaluate={() => void handleEvaluateTopicDraft()}
                  topicFeedback={topicFeedback}
                />
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </SidebarProvider>
  );
}
