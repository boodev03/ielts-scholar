"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Microphone,
  Plus,
  Question,
  SpeakerHigh,
  Star,
  User,
  X,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type MessageLike = {
  id: string;
  role: "user" | "assistant" | "system";
  parts?: Array<{ type: string; text?: string }>;
};

type LookupAnchor = {
  text: string;
  x: number;
  y: number;
} | null;

type DictionaryEntry = {
  partOfSpeech: string;
  translation: string;
  meanings: string[];
  examples: string[];
};

type DictionaryData = {
  selectedText: string;
  ipa: string;
  globalTranslation: string;
  entries: DictionaryEntry[];
  notes: string[];
};

type LookupMode = "website" | "extension";

function getMessageText(message: MessageLike) {
  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="mt-1 text-sm font-bold leading-6">{children}</h3>
          ),
          p: ({ children }) => <p className="text-sm leading-6">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
              {children}
            </ul>
          ),
          li: ({ children }) => <li className="text-sm leading-6">{children}</li>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-black/5 px-1 py-0.5 text-[12px]">{children}</code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function AIMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[85%] items-start gap-3">
      <Avatar
        size="sm"
        className="mt-0.5 size-7 border-0 bg-[var(--color-primary-container)] after:hidden"
      >
        <AvatarFallback className="bg-transparent text-[var(--color-primary)]">
          AI
        </AvatarFallback>
      </Avatar>

      <Card className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border-0 bg-[var(--color-surface-container-lowest)] px-4 py-3 text-sm leading-6 text-[var(--color-on-surface)] shadow-[0_12px_40px_rgba(25,28,30,0.04)] ring-0">
        {children}
      </Card>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <Card className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm border-0 bg-[var(--color-primary-container)] px-4 py-3 text-sm leading-6 text-[var(--color-on-primary-container)] shadow-none ring-0">
        {children}
      </Card>
    </div>
  );
}

function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function ChatArea({
  onAddFlashcard,
}: {
  onAddFlashcard: (word: string) => boolean;
}) {
  const [input, setInput] = useState("");
  const [lookupMode, setLookupMode] = useState<LookupMode>("website");
  const [lookupAnchor, setLookupAnchor] = useState<LookupAnchor>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupData, setLookupData] = useState<DictionaryData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenRef = useRef<string>("");

  const { messages, sendMessage, status, error } = useChat();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("lookup-mode");
    if (saved === "website" || saved === "extension") {
      setLookupMode(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lookup-mode", lookupMode);
  }, [lookupMode]);

  useEffect(() => {
    if (lookupMode === "extension") {
      setLookupAnchor(null);
    }
  }, [lookupMode]);

  const displayMessages = useMemo(
    () =>
      (messages as MessageLike[])
        .map((message) => ({
          id: message.id,
          role: message.role,
          text: getMessageText(message),
        }))
        .filter((message) => message.text.length > 0),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, status]);

  useEffect(() => {
    if (!lookupAnchor?.text) return;

    const selected = lookupAnchor.text.trim();
    if (!selected || selected === lastSpokenRef.current) return;

    speakText(selected);
    lastSpokenRef.current = selected;
  }, [lookupAnchor?.text]);

  useEffect(() => {
    if (!lookupAnchor?.text) {
      setLookupData(null);
      setLookupError(null);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchDictionary = async () => {
      setLookupLoading(true);
      setLookupError(null);
      setLookupData(null);

      try {
        const response = await fetch("/api/dictionary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: lookupAnchor.text, targetLanguage: "Vietnamese" }),
          signal: controller.signal,
        });

        const data = (await response.json()) as DictionaryData & { error?: string };

        if (!response.ok) {
          setLookupError(data.error ?? "Failed to load dictionary information.");
          return;
        }

        setLookupData(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLookupError("Failed to load dictionary information.");
      } finally {
        setLookupLoading(false);
      }
    };

    fetchDictionary();

    return () => controller.abort();
  }, [lookupAnchor?.text]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const updateLookupAnchor = () => {
    if (lookupMode === "extension") {
      setLookupAnchor(null);
      return;
    }

    const selection = window.getSelection();
    const root = messagesRef.current;
    if (!selection || !root || selection.isCollapsed || !selection.rangeCount) {
      setLookupAnchor(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length > 500) {
      setLookupAnchor(null);
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !root.contains(anchorNode)) {
      setLookupAnchor(null);
      return;
    }

    const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
    setLookupAnchor({
      text: selectedText,
      x: Math.max(24, Math.min(window.innerWidth - 24, rangeRect.left + rangeRect.width / 2)),
      y: Math.max(12, rangeRect.bottom + 10),
    });
  };

  const addToFlashcard = () => {
    if (!lookupAnchor?.text) return;

    const normalized = lookupAnchor.text.trim().replace(/\s+/g, " ");
    if (!normalized) return;

    const added = onAddFlashcard(normalized);
    if (added) {
      toast.success(`Added "${normalized}" to flashcards.`);
    } else {
      toast.warning(`"${normalized}" is already in your flashcards.`);
    }
  };

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-8 py-5">
        <h1
          className="text-xl font-bold text-[var(--color-on-surface)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Chat
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-[color:var(--color-outline-variant)]/35 bg-[var(--color-surface-container-lowest)] p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLookupMode("website")}
              className={`h-7 rounded-full px-2.5 text-[11px] ${
                lookupMode === "website"
                  ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)]"
              }`}
            >
              Website
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLookupMode("extension")}
              className={`h-7 rounded-full px-2.5 text-[11px] ${
                lookupMode === "extension"
                  ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)]"
              }`}
            >
              Extension
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-[var(--color-on-surface-variant)] hover:bg-black/5"
          >
            <Question size={17} weight="regular" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-[var(--color-on-surface-variant)] hover:bg-black/5"
          >
            <User size={17} weight="regular" />
          </Button>
        </div>
      </div>

      <div
        ref={messagesRef}
        className="relative flex flex-1 flex-col gap-4 overflow-y-auto px-8 pb-2"
        onMouseUp={updateLookupAnchor}
        onKeyUp={updateLookupAnchor}
        onDoubleClick={updateLookupAnchor}
      >
        {lookupAnchor && typeof document !== "undefined"
          ? createPortal(
              <Card
                className="fixed z-[100] w-[420px] max-w-[calc(100vw-24px)] rounded-2xl border border-[color:var(--color-outline-variant)]/45 bg-[var(--color-surface-container-lowest)] p-0 shadow-[0_16px_36px_rgba(25,28,30,0.2)]"
                style={{
                  left: lookupAnchor.x,
                  top: lookupAnchor.y,
                  transform: "translateX(-50%)",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 border-b border-[color:var(--color-outline-variant)]/35 p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    onClick={() => speakText(lookupAnchor.text)}
                  >
                    <SpeakerHigh size={16} weight="bold" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    onClick={addToFlashcard}
                  >
                    <Star size={16} weight="bold" />
                  </Button>
                  <div className="ml-auto" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    onClick={() => setLookupAnchor(null)}
                  >
                    <X size={16} weight="bold" />
                  </Button>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-4">
                  {lookupLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-8 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[90%]" />
                      <Skeleton className="h-4 w-[80%]" />
                    </div>
                  ) : lookupError ? (
                    <p className="text-sm text-red-600">{lookupError}</p>
                  ) : lookupData ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[30px] font-semibold leading-tight text-[var(--color-on-surface)]">
                          {lookupData.selectedText || lookupAnchor.text}
                        </p>
                        {lookupData.ipa ? (
                          <p className="mt-1 text-lg text-[var(--color-on-surface-variant)]">
                            /{lookupData.ipa}/
                          </p>
                        ) : null}
                        {lookupData.globalTranslation ? (
                          <p className="mt-1 text-[20px] font-medium text-[var(--color-on-surface)]">
                            {lookupData.globalTranslation}
                          </p>
                        ) : null}
                      </div>

                      {lookupData.entries.map((entry, idx) => (
                        <div key={`${entry.partOfSpeech}-${idx}`} className="space-y-2">
                          <p className="text-[20px] italic text-[var(--color-on-surface-variant)]">
                            {entry.partOfSpeech}
                          </p>
                          <p className="text-[28px] font-medium leading-tight text-[var(--color-on-surface)]">
                            {entry.translation}
                          </p>

                          {entry.meanings.length > 0 ? (
                            <ul className="space-y-1 pl-5 text-[15px] leading-7 text-[var(--color-on-surface)] list-disc">
                              {entry.meanings.map((meaning) => (
                                <li key={meaning}>{meaning}</li>
                              ))}
                            </ul>
                          ) : null}

                          {entry.examples.length > 0 ? (
                            <div className="space-y-1">
                              {entry.examples.map((example) => (
                                <p
                                  key={example}
                                  className="text-[14px] leading-6 text-[var(--color-on-surface-variant)]"
                                >
                                  {example}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}

                      {lookupData.notes.length > 0 ? (
                        <div className="space-y-1 border-t border-[color:var(--color-outline-variant)]/35 pt-3">
                          {lookupData.notes.map((note) => (
                            <p key={note} className="text-[13px] leading-6 text-[var(--color-on-surface-variant)]">
                              {note}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>,
              document.body
            )
          : null}

        {displayMessages.length === 0 ? (
          <AIMessage>
            Ask me anything about IELTS writing, speaking, grammar, or vocabulary.
          </AIMessage>
        ) : null}

        {displayMessages.map((message) => {
          if (message.role === "user") {
            return <UserMessage key={message.id}>{message.text}</UserMessage>;
          }
          return (
            <AIMessage key={message.id}>
              <MarkdownText text={message.text} />
            </AIMessage>
          );
        })}

        {isBusy ? <AIMessage>Thinking...</AIMessage> : null}

        {error ? (
          <Card className="rounded-2xl border-0 bg-red-50 px-4 py-3 text-sm text-red-700 ring-0">
            Failed to get response. Check your `GOOGLE_GENERATIVE_AI_API_KEY` and
            try again.
          </Card>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-6 py-4">
        <div className="flex h-14 items-center gap-2 rounded-full border border-[color:var(--color-outline-variant)]/35 bg-[var(--color-surface-container-lowest)] px-3 shadow-[0_8px_24px_rgba(25,28,30,0.06)]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]"
          >
            <Plus size={17} weight="regular" />
          </Button>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask anything..."
            rows={1}
            disabled={isBusy}
            className="max-h-28 min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-0 text-sm text-[var(--color-on-surface)] shadow-none placeholder:text-[var(--color-on-surface-variant)]/75 focus-visible:ring-0 [field-sizing:content]"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
          >
            <Microphone size={17} weight="regular" />
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy}
            className="size-10 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-fixed-variant))] p-0 text-white shadow-[0_6px_18px_rgba(0,69,50,0.25)] hover:opacity-90 active:scale-[0.96] disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
              <rect x="2" y="7" width="2.5" height="6" rx="1.25" fill="currentColor" />
              <rect x="6" y="4" width="2.5" height="12" rx="1.25" fill="currentColor" />
              <rect x="10" y="2" width="2.5" height="16" rx="1.25" fill="currentColor" />
              <rect x="14" y="5" width="2.5" height="10" rx="1.25" fill="currentColor" />
            </svg>
          </Button>
        </div>
      </div>
    </main>
  );
}
