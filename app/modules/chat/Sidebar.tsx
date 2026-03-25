"use client";

import { BookIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, PenIcon, PlusIcon } from "../../components/icons";

const navItems = [
  { label: "Learning History", icon: ClockIcon },
  { label: "Vocabulary Bank",  icon: BookIcon },
  { label: "Grammar Guide",    icon: PenIcon },
];

const recentSessions = [
  { label: "Learning History", active: true },
  { label: "Grammar Guide 2",  active: true },
  { label: "Recent Sessions",  active: true },
];

export default function Sidebar() {
  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-full"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        {/* Logo */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-fixed-variant))",
          }}
        >
          I
        </div>

        <button
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:opacity-70"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <ChevronRightIcon size={15} />
        </button>
      </div>

      {/* ── New Session ── */}
      <div className="px-3 mb-5">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-fixed-variant))",
          }}
        >
          <PlusIcon size={14} />
          New Session
        </button>
      </div>

      {/* ── Primary Nav ── */}
      <nav className="px-2 flex flex-col gap-0.5">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/50 text-left"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Recent Sessions ── */}
      <div className="mt-5 px-2 flex-1">
        <p
          className="px-3 text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--color-outline-variant)" }}
        >
          Recent Sessions
        </p>

        <div className="flex flex-col gap-0.5">
          {recentSessions.map((s) => (
            <button
              key={s.label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/50 text-left"
              style={{ color: "var(--color-on-surface)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── User Profile ── */}
      <div className="px-3 py-4 mt-auto">
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-colors hover:bg-white/40"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            JR
          </div>

          <div className="flex-1 text-left min-w-0">
            <p
              className="text-sm font-semibold truncate leading-tight"
              style={{ color: "var(--color-on-surface)" }}
            >
              Julian Richards
            </p>
            <p
              className="text-xs truncate leading-tight"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Free Scholar
            </p>
          </div>

          <ChevronDownIcon size={14} style={{ color: "var(--color-on-surface-variant)" }} />
        </button>
      </div>
    </aside>
  );
}
