"use client";

/* ─── Circular Progress ──────────────────────────────────────── */
function CircularProgress({
  value,
  label,
  sublabel,
}: {
  value: number;     // 0–100
  label: string;
  sublabel: string;
}) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="var(--color-surface-container-high)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-on-surface)" }}
          >
            {label}
          </span>
          <span
            className="text-[10px] mt-0.5"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {sublabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Vocabulary Item ────────────────────────────────────────── */
function VocabItem({
  term,
  definition,
  band,
}: {
  term: string;
  definition: string;
  band: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p
          className="text-sm font-semibold leading-snug truncate"
          style={{ color: "var(--color-on-surface)" }}
        >
          {term}
        </p>
        <p
          className="text-xs leading-snug truncate"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {definition}
        </p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: "var(--color-primary-container)",
          color: "var(--color-primary)",
        }}
      >
        {band}
      </span>
    </div>
  );
}

/* ─── Learning Insights ──────────────────────────────────────── */
const currentSessionVocab = [
  { term: "Imperative",  definition: "Imperative (verb): Imperative", band: "Band 7.5" },
  { term: "Mitigate",    definition: "Pluralism of mitigate",         band: "Band 7.5" },
  { term: "Degradation", definition: "Detentionrons for degradation", band: "Band 7.5" },
  { term: "Sustainable", definition: "Termitality of sustainable",    band: "Band 7.5" },
];

export default function LearningInsights() {
  return (
    <aside
      className="w-72 flex-shrink-0 h-full overflow-y-auto flex flex-col gap-0"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2
          className="text-lg font-bold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-on-surface)",
          }}
        >
          Learning Insights
        </h2>
      </div>

      {/* Daily Goal card */}
      <div className="mx-4 mb-4">
        <div
          className="rounded-[1.5rem] px-4"
          style={{
            backgroundColor: "var(--color-surface-container-lowest)",
            boxShadow: "0 12px 40px rgba(25,28,30,0.04)",
          }}
        >
          <p
            className="text-xs font-semibold pt-4 mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Daily Goal
          </p>
          <CircularProgress value={68} label="1.2k" sublabel="words" />
        </div>
      </div>

      {/* Current Session */}
      <div className="mx-4 mb-4">
        <div
          className="rounded-[1.5rem] px-4 pb-2"
          style={{
            backgroundColor: "var(--color-surface-container-lowest)",
            boxShadow: "0 12px 40px rgba(25,28,30,0.04)",
          }}
        >
          <p
            className="text-xs font-semibold pt-4 mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Current Session
          </p>

          <div className="flex flex-col divide-y-0">
            {currentSessionVocab.map((item) => (
              <VocabItem key={item.term} {...item} />
            ))}
          </div>
        </div>
      </div>

      {/* Exam CTA */}
      <div className="mx-4 mb-6">
        <div
          className="rounded-[1.5rem] px-5 py-5"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-fixed-variant))",
          }}
        >
          <p className="text-sm font-bold text-white leading-snug mb-1">
            Ready for the Exam?
          </p>
          <p className="text-xs text-white/70 leading-relaxed mb-4">
            Upscaled your exam realisation to premium academic feel.
          </p>
          <button
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--color-surface-container-lowest)",
              color: "var(--color-primary)",
            }}
          >
            Premium now
          </button>
        </div>
      </div>
    </aside>
  );
}
