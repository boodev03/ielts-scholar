"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  ArrowUp,
  Microphone,
  Plus,
  SpeakerHigh,
  Star,
  Translate,
  X,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  chatQueryKeys,
  useConversationMessagesQuery,
  useCreateConversationMutation,
  useCreateMessageMutation,
  useTouchConversationMutation,
} from "@/hooks/api/use-chat";
import { buildConversationTitle } from "@/lib/chat";

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
    <div className="space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="mt-2 text-sm font-bold leading-6">{children}</h3>
          ),
          p: ({ children }) => <p className="text-sm leading-6">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-0.5 pl-5 text-sm leading-6">
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
        className="mt-0.5 size-7 border-0 bg-primary-container after:hidden"
      >
        <AvatarImage src="/logo.png" alt="IELTS Scholar AI" />
        <AvatarFallback className="bg-transparent text-primary">
          AI
        </AvatarFallback>
      </Avatar>

      <Card className="rounded-2xl rounded-tl-sm border-0 bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-on-surface shadow-[0_12px_40px_rgba(25,28,30,0.04)] ring-0">
        {children}
      </Card>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <Card className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm border-0 bg-primary-container px-4 py-3 text-sm leading-6 text-on-primary-container shadow-none ring-0">
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

function buildMessagePreview(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 220) return compact;
  return `${compact.slice(0, 217)}...`;
}

export default function ChatArea({
  onAddFlashcard,
  conversationId,
}: {
  onAddFlashcard: (word: string) => boolean;
  conversationId?: string | null;
}) {
  const [input, setInput] = useState("");
  const [lookupMode, setLookupMode] = useState<LookupMode>("website");
  const [lookupAnchor, setLookupAnchor] = useState<LookupAnchor>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupTranslation, setLookupTranslation] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  const createConversationMutation = useCreateConversationMutation();
  const touchConversationMutation = useTouchConversationMutation();
  const createMessageMutation = useCreateMessageMutation();
  const conversationMessagesQuery = useConversationMessagesQuery(conversationId ?? null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenRef = useRef<string>("");
  const persistedAssistantIdsRef = useRef<Set<string>>(new Set());
  const processedBootstrapRef = useRef<string | null>(null);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    experimental_throttle: 50,
  });

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

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      persistedAssistantIdsRef.current.clear();
    }
  }, [conversationId, setMessages]);

  useEffect(() => {
    if (!conversationId) return;
    if (!conversationMessagesQuery.data?.success) return;

    const uiMessages: UIMessage[] = conversationMessagesQuery.data.data.messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: [{ type: "text", text: message.content }],
    }));

    setMessages(uiMessages);
    persistedAssistantIdsRef.current = new Set(
      conversationMessagesQuery.data.data.messages
        .filter((message) => message.role === "assistant")
        .map((message) => message.id)
    );
  }, [conversationId, conversationMessagesQuery.data, setMessages]);

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
    bottomRef.current?.scrollIntoView({
      behavior: status === "streaming" ? "auto" : "smooth",
    });
  }, [displayMessages, status]);

  useEffect(() => {
    if (!lookupAnchor?.text) return;

    const selected = lookupAnchor.text.trim();
    if (!selected || selected === lastSpokenRef.current) return;

    speakText(selected);
    lastSpokenRef.current = selected;
  }, [lookupAnchor?.text]);

  const isBusy = status === "submitted" || status === "streaming";

  const persistAndSendMessage = useCallback(
    async (targetConversationId: string, text: string) => {
      const preview = buildMessagePreview(text);

      const userMessageResult = await createMessageMutation.mutateAsync({
        conversationId: targetConversationId,
        role: "user",
        content: text,
      });
      if (!userMessageResult.success) {
        toast.warning("Message sent, but failed to save history.");
      }

      await touchConversationMutation.mutateAsync({
        conversationId: targetConversationId,
        lastMessagePreview: preview,
      });
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });

      await sendMessage({ text });
    },
    [createMessageMutation, queryClient, sendMessage, touchConversationMutation]
  );

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");

    if (!conversationId) {
      const created = await createConversationMutation.mutateAsync({
        title: buildConversationTitle(text),
      });
      if (!created.success) {
        toast.error(created.error.message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });
      const nextConversationId = created.data.conversation.id;
      const preview = buildMessagePreview(text);
      const userMessageResult = await createMessageMutation.mutateAsync({
        conversationId: nextConversationId,
        role: "user",
        content: text,
      });
      if (!userMessageResult.success) {
        toast.warning("Message sent, but failed to save history.");
      }

      await touchConversationMutation.mutateAsync({
        conversationId: nextConversationId,
        lastMessagePreview: preview,
      });
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`chat-bootstrap:${nextConversationId}`, text);
      }

      router.push(`/chat/${nextConversationId}`);
      return;
    }

    await persistAndSendMessage(conversationId, text);
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    if (status !== "ready") return;
    if (displayMessages.length === 0) return;

    const lastMessage = displayMessages[displayMessages.length - 1];
    if (lastMessage.role !== "assistant") return;
    if (persistedAssistantIdsRef.current.has(lastMessage.id)) return;

    persistedAssistantIdsRef.current.add(lastMessage.id);

    const persistAssistantMessage = async () => {
      const preview = buildMessagePreview(lastMessage.text);

      await createMessageMutation.mutateAsync({
        conversationId,
        role: "assistant",
        content: lastMessage.text,
      });

      await touchConversationMutation.mutateAsync({
        conversationId,
        lastMessagePreview: preview,
      });

      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });
    };

    void persistAssistantMessage();
  }, [
    conversationId,
    createMessageMutation,
    displayMessages,
    queryClient,
    status,
    touchConversationMutation,
  ]);

  useEffect(() => {
    if (!conversationId) return;
    if (status !== "ready") return;
    const seed =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(`chat-bootstrap:${conversationId}`)
        : null;
    if (!seed) return;

    const seedKey = `${conversationId}:${seed}`;
    if (processedBootstrapRef.current === seedKey) return;
    processedBootstrapRef.current = seedKey;

    const bootstrap = async () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(`chat-bootstrap:${conversationId}`);
      }

      await sendMessage({ text: seed });
    };

    void bootstrap();
  }, [
    conversationId,
    persistAndSendMessage,
    sendMessage,
    status,
  ]);

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
    setLookupTranslation(null);
    setLookupError(null);
    setLookupLoading(false);
    setLookupAnchor({
      text: selectedText,
      x: Math.max(24, Math.min(window.innerWidth - 24, rangeRect.left + rangeRect.width / 2)),
      y: Math.max(12, rangeRect.bottom + 10),
    });
  };

  const handleTranslateSelection = async () => {
    if (!lookupAnchor?.text) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupTranslation(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lookupAnchor.text,
          targetLanguage: "Vietnamese",
        }),
      });

      const data = (await response.json()) as { translation?: string; error?: string };
      if (!response.ok) {
        setLookupError(data.error ?? "Failed to translate selection.");
        return;
      }

      setLookupTranslation(data.translation?.trim() ?? "");
    } catch {
      setLookupError("Failed to translate selection.");
    } finally {
      setLookupLoading(false);
    }
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
          className="text-xl font-bold text-on-surface"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Chat
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-outline-variant/35 bg-surface-container-lowest p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLookupMode("website")}
              className={`h-7 rounded-full px-2.5 text-[11px] ${
                lookupMode === "website"
                  ? "bg-primary text-white hover:bg-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
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
                  ? "bg-primary text-white hover:bg-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              Extension
            </Button>
          </div>
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
                className="fixed z-[100] w-[420px] max-w-[calc(100vw-24px)] rounded-2xl border border-outline-variant/45 bg-surface-container-lowest p-0 shadow-[0_16px_36px_rgba(25,28,30,0.2)]"
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
                <div className="flex items-center gap-1 border-b border-outline-variant/35 p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg px-2.5 text-xs"
                    onClick={() => void handleTranslateSelection()}
                  >
                    <Translate size={14} weight="bold" />
                    Translate
                  </Button>
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
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : lookupError ? (
                    <p className="text-sm text-red-600">{lookupError}</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[26px] font-semibold leading-tight text-on-surface">
                          {lookupAnchor.text}
                        </p>
                      </div>

                      {lookupTranslation ? (
                        <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                            Translation
                          </p>
                          <p className="mt-1 text-base leading-7 text-on-surface">
                            {lookupTranslation}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-on-surface-variant">
                          Click <span className="font-semibold">Translate</span> to translate this
                          selection.
                        </p>
                      )}

                      <div className="space-y-1 border-t border-outline-variant/35 pt-3">
                        <p className="text-[13px] leading-6 text-on-surface-variant">
                          Tip: Double-click a word for faster lookup.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>,
              document.body
            )
          : null}

        {!conversationId && displayMessages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
            <p
              className="text-3xl font-semibold text-on-surface-variant"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What&apos;s on your mind today?
            </p>
          </div>
        ) : null}

        {displayMessages.map((message, idx) => {
          if (message.role === "user") {
            return <UserMessage key={`${message.id}-${idx}`}>{message.text}</UserMessage>;
          }
          return (
            <AIMessage key={`${message.id}-${idx}`}>
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
        <div className="flex h-14 items-center gap-2 rounded-full border border-outline-variant/35 bg-surface-container-lowest px-3 shadow-[0_8px_24px_rgba(25,28,30,0.06)]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
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
            className="max-h-28 min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-0 text-sm text-on-surface shadow-none placeholder:text-on-surface-variant/75 focus-visible:ring-0 field-sizing-content"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <Microphone size={17} weight="regular" />
          </Button>

          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isBusy}
            className="size-10 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-fixed-variant))] p-0 text-white shadow-[0_6px_18px_rgba(0,69,50,0.25)] hover:opacity-90 active:scale-[0.96] disabled:opacity-40"
          >
            {input.trim().length > 0 ? (
              <ArrowUp size={18} weight="bold" />
            ) : (
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                <rect x="2" y="7" width="2.5" height="6" rx="1.25" fill="currentColor" />
                <rect x="6" y="4" width="2.5" height="12" rx="1.25" fill="currentColor" />
                <rect x="10" y="2" width="2.5" height="16" rx="1.25" fill="currentColor" />
                <rect x="14" y="5" width="2.5" height="10" rx="1.25" fill="currentColor" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
