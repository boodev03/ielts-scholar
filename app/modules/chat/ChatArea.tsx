"use client";

import { useState } from "react";
import { CopyIcon, MicIcon, PaperclipIcon, SendIcon } from "../../components/icons";

/* ─── Types ──────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: "user" | "ai";
  content: React.ReactNode;
}

/* ─── Vocabulary Popover ────────────────────────────────────── */
function VocabularyPopover({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute bottom-[calc(100%+8px)] right-0 w-64 rounded-[1.5rem] p-4 z-20"
      style={{
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 12px 40px rgba(25,28,30,0.06)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-base font-bold leading-snug"
          style={{ color: "var(--color-on-surface)", fontFamily: "var(--font-sans)" }}
        >
          Sustainable
        </p>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
          style={{
            backgroundColor: "var(--color-primary-container)",
            color: "var(--color-primary)",
          }}
        >
          Vocabulary
        </span>
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        conversations with plastic salt for sustainable reproductivity.
      </p>
      <button
        className="mt-3 text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
        style={{ color: "var(--color-primary)" }}
        onClick={onClose}
      >
        Learn more
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Band 7.5 Alternative Card ──────────────────────────────── */
function BandAlternativeCard() {
  return (
    <div
      className="rounded-[1.5rem] p-5 my-1"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
          Band 7.5 Alternative
        </span>
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <CopyIcon size={13} />
        </button>
      </div>

      {/* Body */}
      <p className="text-sm leading-relaxed text-white/90 mb-3">
        Glassmorphism effect with some{" "}
        <mark
          className="rounded px-0.5"
          style={{ backgroundColor: "rgba(255,210,80,0.35)", color: "white" }}
        >
          deep immediately highlighted sentence
        </mark>{" "}
        and rooted look with as{" "}
        <mark
          className="rounded px-0.5"
          style={{ backgroundColor: "rgba(255,210,80,0.35)", color: "white" }}
        >
          highlighted refined some.
        </mark>
      </p>

      {/* Highlighted sentence */}
      <div
        className="rounded-xl px-4 py-2.5 mb-4 text-sm leading-relaxed"
        style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.95)" }}
      >
        Therefore: a reality pollution to obscured in the{" "}
        <span style={{ color: "rgba(168,230,195,0.95)" }}>pernicious force of pollution.</span>
      </div>

      {/* Apply */}
      <div className="flex justify-end">
        <button
          className="px-5 py-1.5 rounded-[0.75rem] text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            backgroundColor: "var(--color-surface-container-lowest)",
            color: "var(--color-primary)",
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/* ─── AI Message Bubble ──────────────────────────────────────── */
function AIMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      {/* AI Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: "var(--color-primary-container)" }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.75} style={{ color: "var(--color-primary)" }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
      </div>

      <div
        className="rounded-[1rem] rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          backgroundColor: "var(--color-surface-container-lowest)",
          color: "var(--color-on-surface)",
          boxShadow: "0 12px 40px rgba(25,28,30,0.04)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── User Message Bubble ─────────────────────────────────────── */
function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] rounded-[1rem] rounded-br-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          backgroundColor: "var(--color-primary-container)",
          color: "var(--color-on-primary-container)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Chat Input ─────────────────────────────────────────────── */
function ChatInput() {
  const [value, setValue] = useState("");

  return (
    <div className="px-6 py-4">
      <div
        className="flex items-center gap-3 rounded-[1.5rem] px-4 py-3"
        style={{ backgroundColor: "var(--color-surface-container-highest)" }}
      >
        {/* Left actions */}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/5"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <MicIcon size={16} />
        </button>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/5"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <PaperclipIcon size={16} />
        </button>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your sentence here..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-sm"
          style={{
            color: "var(--color-on-surface)",
          }}
        />

        {/* Right actions */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98] flex-shrink-0"
          style={{
            backgroundColor: "var(--color-surface-container-low)",
            color: "var(--color-on-surface)",
          }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Analyze Text
        </button>

        <button
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white flex-shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-fixed-variant))",
          }}
        >
          Send
          <SendIcon size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── Chat Area (main export) ────────────────────────────────── */
export default function ChatArea() {
  const [showPopover, setShowPopover] = useState(true);

  return (
    <main className="flex-1 flex flex-col min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 flex-shrink-0">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-on-surface)" }}
        >
          Chat
        </h1>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 pb-2 flex flex-col gap-4">

        {/* User message */}
        <UserMessage>
          What is the receipt of pollution is a and the environmental afferences
          employee is, where&apos;s would save flow its energy?
        </UserMessage>

        {/* AI message */}
        <AIMessage>
          Mello, pollution is a sasment to stand chat and affects community to the
          economic organization in his contensation and incredgable sheutica
          menbers or probles, and medications and environmental, contains your
          organization ai in the entire.
        </AIMessage>

        {/* Band 7.5 Alternative card */}
        <BandAlternativeCard />

        {/* AI message with vocabulary popover */}
        <AIMessage>
          <span className="relative inline">
            <span>Sustainable</span>{" "}
            {showPopover && (
              <span className="relative inline-block">
                <VocabularyPopover onClose={() => setShowPopover(false)} />
              </span>
            )}
            is a more portable so dxhamts acusable, and gro
            environmenty and sind sorrland organ.
          </span>
        </AIMessage>

      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput />
      </div>
    </main>
  );
}
