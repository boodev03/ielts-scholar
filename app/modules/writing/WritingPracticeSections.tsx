"use client";

import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Robot } from "@phosphor-icons/react";
import { CursorText, Lightbulb, TrendUp } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { Languages, NotebookPen } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { CriterionScore } from "@/lib/writing/scoring";

type ExerciseType = "sentence-translation" | "topic-writing";
type Difficulty = "beginner" | "intermediate" | "advanced";

type SentencePractice = {
  title: string;
  sentences: string[];
  tips: string[];
};

type TopicPractice = {
  title: string;
  description: string;
  bulletPoints: string[];
  tips: string[];
};

type SentenceAttemptFeedback = {
  accuracy: number;
  bandScore: number;
  criteria: CriterionScore[];
  focusAreas: string[];
  correctedTranslation: string;
  briefExplanation: string;
};

type SentenceAttempt = {
  userTranslation: string;
  feedback: SentenceAttemptFeedback;
};

type TopicFeedback = {
  accuracy: number;
  bandScore: number;
  criteria: CriterionScore[];
  focusAreas: string[];
  improvements: string[];
  improvedDraft: string;
  briefExplanation: string;
};

function accuracyTone(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-100 border-emerald-200";
  if (score >= 70) return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-rose-700 bg-rose-100 border-rose-200";
}

const QUICK_PROMPTS = [
  "What does this sentence mean?",
  "Give me a hint",
  "What's a key word here?",
];

type AiAssistPanelProps = {
  currentSentence: string;
  nativeLanguage: string;
};

function AiAssistPanel({ currentSentence, nativeLanguage }: AiAssistPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/writing-practice/assist",
        body: { currentSentence, nativeLanguage },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    void sendMessage({ text });
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isBusy) return;
    void sendMessage({ text: prompt });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
      <div className="flex items-center gap-2 border-b border-outline-variant/20 px-5 py-3">
        <Robot size={17} weight="bold" className="text-primary" />
        <p className="text-sm font-semibold text-on-surface">AI Support</p>
        <span className="ml-auto text-[11px] text-on-surface-variant/60">Ask anything about this sentence</span>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-60 min-h-[80px] flex-col gap-3 overflow-y-auto px-5 py-3"
      >
        {messages.length === 0 ? (
          <p className="text-xs italic text-on-surface-variant/60">
            Ask about words, grammar, or how to phrase things in English.
          </p>
        ) : null}

        {messages.map((msg) => {
          const text = (msg.parts ?? [])
            .filter((p) => p.type === "text")
            .map((p) => ("text" in p ? (p.text as string) : ""))
            .join("");
          if (!text) return null;

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-on-surface"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown>{text}</ReactMarkdown>
                ) : (
                  text
                )}
              </div>
            </div>
          );
        })}

        {isBusy ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface-container-low px-3 py-2">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/50 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/50 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/50 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 px-5 pb-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              className="rounded-full border border-outline-variant/35 bg-white px-2.5 py-1 text-[11px] text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-outline-variant/20 px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          placeholder="Ask about a word or phrase..."
          className="flex-1 rounded-xl border border-outline-variant/40 bg-white px-3 py-2 text-sm outline-none placeholder:text-on-surface-variant/50 focus:border-primary/50 disabled:opacity-60"
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={isBusy || !input.trim()}
          className="h-9 w-9 shrink-0 rounded-xl bg-primary text-white hover:bg-primary-fixed-variant disabled:opacity-50"
        >
          <ArrowUp size={15} weight="bold" />
        </Button>
      </div>
    </Card>
  );
}

type SetupPanelProps = {
  exerciseType: ExerciseType;
  setExerciseType: (value: ExerciseType) => void;
  nativeLanguage: string;
  setNativeLanguage: (value: string) => void;
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
  topicName: string;
  setTopicName: (value: string) => void;
  languageOptions: string[];
  generateLoading: boolean;
  onGenerate: () => void;
};

export function WritingSetupPanel({
  exerciseType,
  setExerciseType,
  nativeLanguage,
  setNativeLanguage,
  difficulty,
  setDifficulty,
  topicName,
  setTopicName,
  languageOptions,
  generateLoading,
  onGenerate,
}: SetupPanelProps) {
  return (
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

      <Card className="rounded-[8px] border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
        <p className="mb-4 text-2xl font-semibold text-on-surface">Exercise Type</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setExerciseType("sentence-translation")}
            className={`rounded-[8px] border px-5 py-5 text-left shadow-[0_10px_24px_rgba(25,28,30,0.08)] transition ${
              exerciseType === "sentence-translation"
                ? "border-primary/45 bg-white shadow-[0_12px_26px_rgba(25,28,30,0.12)]"
                : "border-outline-variant/35 bg-white hover:border-primary/30"
            }`}
          >
            <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary-container/60 text-primary">
              <Languages size={16} />
            </span>
            <p className="text-lg font-semibold text-on-surface">Sentence Translation</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Master grammar and vocabulary by translating nuanced sentence groups.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setExerciseType("topic-writing")}
            className={`rounded-[8px] border px-5 py-5 text-left shadow-[0_10px_24px_rgba(25,28,30,0.08)] transition ${
              exerciseType === "topic-writing"
                ? "border-primary/45 bg-white shadow-[0_12px_26px_rgba(25,28,30,0.12)]"
                : "border-outline-variant/35 bg-white hover:border-primary/30"
            }`}
          >
            <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary-container/60 text-primary">
              <NotebookPen size={16} />
            </span>
            <p className="text-lg font-semibold text-on-surface">Topic Writing</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Deepen your structured expression with IELTS-style long-form prompts.
            </p>
          </button>
        </div>

        <p className="mb-4 mt-6 text-2xl font-semibold text-on-surface">Core Parameters</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-on-surface-variant">Language Focus</p>
            <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
              <SelectTrigger className="h-11 rounded-[8px] border-outline-variant/45 bg-white shadow-[0_5px_16px_rgba(25,28,30,0.06)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[8px]">
                {languageOptions.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-on-surface-variant">Proficiency Level</p>
            <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
              <SelectTrigger className="h-11 rounded-[8px] border-outline-variant/45 bg-white shadow-[0_5px_16px_rgba(25,28,30,0.06)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[8px]">
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-on-surface-variant">Focus Topic (Optional)</p>
            <p className="text-[11px] italic text-on-surface-variant/70">Leave blank for random IELTS topic</p>
          </div>
          <Textarea
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g. education reform, social media impact..."
            rows={4}
            className="min-h-[120px] rounded-[8px] border-outline-variant/45 bg-white shadow-[0_5px_16px_rgba(25,28,30,0.06)]"
          />
        </div>

        <div className="mt-7 flex flex-col items-center justify-center">
          <Button
            type="button"
            disabled={generateLoading}
            onClick={onGenerate}
            className="h-11 rounded-[8px] bg-primary px-6 text-white hover:bg-primary-fixed-variant"
          >
            {generateLoading ? "Generating..." : "Generate Exercise"}
          </Button>
          <p className="mt-2 text-xs text-on-surface-variant">Takes around 3 seconds to curate your session</p>
        </div>
      </Card>
    </div>
  );
}

type SentenceSectionProps = {
  sentencePractice: SentencePractice;
  attempts: Record<number, SentenceAttempt>;
  historyEntries: Array<{ index: number; attempt: SentenceAttempt }>;
  currentSentenceIndex: number;
  currentSentence: string;
  nativeLanguage: string;
  answer: string;
  evaluateLoading: boolean;
  currentAttempt: SentenceAttempt | null;
  answerRef: RefObject<HTMLInputElement | null>;
  setAnswer: (value: string) => void;
  jumpToSentence: (index: number) => void;
  onAnswerKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  latestSubmission: {
    sentenceIndex: number;
    sourceSentence: string;
    userTranslation: string;
    feedback: SentenceAttemptFeedback;
  } | null;
};

export function SentenceExerciseSection({
  sentencePractice,
  attempts,
  historyEntries,
  currentSentenceIndex,
  currentSentence,
  nativeLanguage,
  answer,
  evaluateLoading,
  currentAttempt,
  answerRef,
  setAnswer,
  jumpToSentence,
  onAnswerKeyDown,
  onSubmit,
  latestSubmission,
}: SentenceSectionProps) {
  const completedCount = Object.keys(attempts).length;

  return (
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
              <p className="text-sm font-semibold text-on-surface">Quick Translate</p>
            </div>
            <Badge variant="outline" className="border-outline-variant/40 bg-white">
              {currentSentenceIndex + 1}/{sentencePractice.sentences.length}
            </Badge>
          </div>

          <p className="mb-2 rounded-xl bg-surface-container-low px-3 py-2 text-sm leading-6 text-on-surface">{currentSentence}</p>

          <Input
            ref={answerRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onAnswerKeyDown}
            disabled={evaluateLoading}
            placeholder="Type your translation and press Enter..."
            className="h-11 rounded-xl border-outline-variant/45 bg-white"
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-on-surface-variant">Press Enter to submit</p>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={evaluateLoading}
              className="rounded-xl bg-primary px-4 text-white hover:bg-primary-fixed-variant"
            >
              {evaluateLoading ? "Scoring..." : "Submit"}
            </Button>
          </div>
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
            <div className="mb-3 space-y-2">
              {currentAttempt.feedback.criteria.map((criterion) => (
                <div key={criterion.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-on-surface">{criterion.label}</p>
                    <p className="text-xs text-on-surface-variant">{criterion.score}%</p>
                  </div>
                  <Progress value={criterion.score} className="h-1.5" />
                </div>
              ))}
            </div>
            {currentAttempt.feedback.focusAreas.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {currentAttempt.feedback.focusAreas.map((item) => (
                  <Badge key={item} variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                    Focus: {item}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface">{currentAttempt.feedback.correctedTranslation}</p>
            <p className="mt-2 text-sm text-on-surface-variant">{currentAttempt.feedback.briefExplanation}</p>
          </Card>
        ) : null}

        {latestSubmission ? (
          <Card className="rounded-3xl border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_10px_28px_rgba(25,28,30,0.05)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-on-surface">Latest Submission</p>
              <Badge variant="outline" className="border-outline-variant/40 bg-white">
                Sentence {latestSubmission.sentenceIndex + 1}
              </Badge>
            </div>
            <p className="mb-2 rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
              {latestSubmission.sourceSentence}
            </p>
            <p className="mb-2 rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface">
              {latestSubmission.userTranslation}
            </p>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">Accuracy</p>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${accuracyTone(latestSubmission.feedback.accuracy)}`}>
                {latestSubmission.feedback.accuracy}%
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">Band {latestSubmission.feedback.bandScore.toFixed(1)}</p>
            <p className="mt-2 text-sm text-on-surface-variant">{latestSubmission.feedback.briefExplanation}</p>
          </Card>
        ) : null}

        <AiAssistPanel currentSentence={currentSentence} nativeLanguage={nativeLanguage} />
      </div>
    </div>
  );
}

type TopicSectionProps = {
  topicPractice: TopicPractice;
  topicDraftRef: RefObject<HTMLTextAreaElement | null>;
  topicWritingDraft: string;
  setTopicWritingDraft: (value: string) => void;
  topicEvaluateLoading: boolean;
  onEvaluate: () => void;
  topicFeedback: TopicFeedback | null;
};

export function TopicExerciseSection({
  topicPractice,
  topicDraftRef,
  topicWritingDraft,
  setTopicWritingDraft,
  topicEvaluateLoading,
  onEvaluate,
  topicFeedback,
}: TopicSectionProps) {
  return (
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
              onClick={onEvaluate}
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

            <div className="mb-3 space-y-2">
              {topicFeedback.criteria.map((criterion) => (
                <div key={criterion.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-on-surface">{criterion.label}</p>
                    <p className="text-xs text-on-surface-variant">{criterion.score}%</p>
                  </div>
                  <Progress value={criterion.score} className="h-1.5" />
                </div>
              ))}
            </div>

            {topicFeedback.focusAreas.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {topicFeedback.focusAreas.map((item) => (
                  <Badge key={item} variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                    Focus: {item}
                  </Badge>
                ))}
              </div>
            ) : null}

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
  );
}
