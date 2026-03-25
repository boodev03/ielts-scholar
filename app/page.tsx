export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-6">
      <div className="w-full max-w-xl rounded-3xl border border-[color:var(--color-outline-variant)]/40 bg-white p-8 text-center shadow-[0_16px_60px_rgba(0,69,50,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
          IELTS Scholar
        </p>
        <h1
          className="mt-3 text-3xl font-semibold text-[var(--color-on-surface)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Authentication UI Ready
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]">
          Open the new screens and continue integrating your auth provider.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <a
            href="/login"
            className="rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Login
          </a>
          <a
            href="/sign-up"
            className="rounded-2xl border border-[color:var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] px-4 py-3 text-sm font-semibold text-[var(--color-on-surface)] transition hover:bg-[var(--color-surface-container-low)]"
          >
            Sign Up
          </a>
          <a
            href="/chat"
            className="rounded-2xl border border-[color:var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] px-4 py-3 text-sm font-semibold text-[var(--color-on-surface)] transition hover:bg-[var(--color-surface-container-low)]"
          >
            Go to Chat
          </a>
        </div>
      </div>
    </div>
  );
}
