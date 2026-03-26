"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, LockKey } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleSignInMutation, useSignInMutation, useSignUpMutation } from "@/hooks/api/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { signInSchema, signUpSchema, type SignUpInput } from "@/types/auth";

type AuthMode = "login" | "sign-up";

const CONTENT: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    cta: string;
    altLabel: string;
    altHref: string;
    altText: string;
  }
> = {
  login: {
    title: "Welcome Back",
    subtitle: "Continue your IELTS momentum with smart feedback and focused practice sessions.",
    cta: "Sign In",
    altLabel: "New here?",
    altHref: "/sign-up",
    altText: "Create account",
  },
  "sign-up": {
    title: "Create Your Account",
    subtitle: "Build better fluency, grammar, and vocabulary with an AI coach tuned for IELTS.",
    cta: "Create Account",
    altLabel: "Already have an account?",
    altHref: "/login",
    altText: "Sign in",
  },
};

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const content = CONTENT[mode];
  const router = useRouter();
  const signInMutation = useSignInMutation();
  const signUpMutation = useSignUpMutation();
  const googleMutation = useGoogleSignInMutation();
  const { setLastEmail, pendingProvider, setPendingProvider } = useAuthStore();

  const isSignUp = mode === "sign-up";
  const form = useForm<SignUpInput>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const formLoading =
    signInMutation.isPending || signUpMutation.isPending || googleMutation.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setLastEmail(values.email);

    if (isSignUp) {
      const parsed = signUpSchema.safeParse(values);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        if (fieldErrors.email?.[0]) form.setError("email", { message: fieldErrors.email[0] });
        if (fieldErrors.password?.[0]) form.setError("password", { message: fieldErrors.password[0] });
        if (fieldErrors.confirmPassword?.[0]) {
          form.setError("confirmPassword", { message: fieldErrors.confirmPassword[0] });
        }
        return;
      }

      const result = await signUpMutation.mutateAsync(parsed.data);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      if (result.data.requiresEmailVerification) {
        toast.success("Account created. Please check your email to verify your account.");
        router.push("/login");
        return;
      }

      toast.success("Account created successfully.");
      router.push("/chat");
      return;
    }

    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      if (fieldErrors.email?.[0]) form.setError("email", { message: fieldErrors.email[0] });
      if (fieldErrors.password?.[0]) form.setError("password", { message: fieldErrors.password[0] });
      return;
    }

    const result = await signInMutation.mutateAsync(parsed.data);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Signed in successfully.");
    router.push("/chat");
  });

  const onContinueWithGoogle = async () => {
    setPendingProvider("google");
    const redirectTo = `${window.location.origin}/auth/callback?next=/chat`;
    const result = await googleMutation.mutateAsync({ redirectTo });

    if (!result.success) {
      setPendingProvider(null);
      toast.error(result.error.message);
      return;
    }

    window.location.href = result.data.url;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-14 -top-10 h-72 w-72 rounded-full bg-primary-container blur-3xl" />
        <div className="absolute -right-10 top-20 h-72 w-72 rounded-full bg-[#d6f8e3] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#e9f8ff] blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[1fr_460px] lg:px-8">
        <section className="hidden lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-outline-variant/50 bg-white/70 px-4 py-2 text-[12px] font-medium text-on-surface backdrop-blur">
              <Image src="/logo.png" alt="IELTS Scholar" width={16} height={16} className="rounded-sm" />
              IELTS Scholar Studio
            </p>
            <h1
              className="mt-8 max-w-xl text-5xl font-semibold leading-tight text-on-surface"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Master IELTS with precision, not guesswork.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant">
              Analyze writing and speaking responses, save key vocabulary, and get context-aware
              explanations in one focused workspace.
            </p>
          </div>

          <div className="grid max-w-xl gap-3 rounded-3xl border border-outline-variant/35 bg-white/85 p-5 backdrop-blur">
            {[
              "Band-focused corrections with clear reasons",
              "Instant translation and context dictionary popup",
              "Flashcard-ready vocabulary from real sessions",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle size={20} weight="fill" className="mt-0.5 text-primary" />
                <p className="text-sm font-medium text-on-surface">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center lg:justify-end">
          <div className="w-full rounded-[2rem] border border-outline-variant/35 bg-white/90 p-6 shadow-[0_30px_90px_rgba(0,69,50,0.12)] backdrop-blur sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant/80">
                {mode === "login" ? "Sign In" : "Sign Up"}
              </p>
              <h2
                className="mt-2 text-3xl font-semibold text-on-surface"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {content.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {content.subtitle}
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="block space-y-1.5">
                <span className="text-[12px] font-medium text-on-surface-variant">
                  Email
                </span>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={formLoading}
                  {...form.register("email")}
                  className="h-12 rounded-2xl border-outline-variant/50 bg-surface-container-lowest px-4 text-sm"
                />
                <p className="text-xs text-red-600">{form.formState.errors.email?.message}</p>
              </div>

              <div className="block space-y-1.5">
                <span className="text-[12px] font-medium text-on-surface-variant">
                  Password
                </span>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  disabled={formLoading}
                  {...form.register("password")}
                  className="h-12 rounded-2xl border-outline-variant/50 bg-surface-container-lowest px-4 text-sm"
                />
                <p className="text-xs text-red-600">{form.formState.errors.password?.message}</p>
              </div>

              {isSignUp ? (
                <div className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-on-surface-variant">
                    Confirm Password
                  </span>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={formLoading}
                    {...form.register("confirmPassword")}
                    className="h-12 rounded-2xl border-outline-variant/50 bg-surface-container-lowest px-4 text-sm"
                  />
                  <p className="text-xs text-red-600">
                    {form.formState.errors.confirmPassword?.message}
                  </p>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={formLoading}
                className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white hover:bg-primary-fixed-variant"
              >
                <span>{content.cta}</span>
                <ArrowRight size={16} weight="bold" />
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
              <button type="button" className="inline-flex items-center gap-1 font-medium hover:opacity-80">
                <LockKey size={14} weight="bold" />
                Secure authentication ready
              </button>
              <p className="font-medium">
                {content.altLabel}{" "}
                <Link className="text-primary hover:underline" href={content.altHref}>
                  {content.altText}
                </Link>
              </p>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={formLoading}
                onClick={onContinueWithGoogle}
                className="h-11 w-full rounded-2xl border-outline-variant/60 bg-white text-sm font-medium"
              >
                <Image src="/google.webp" alt="Google" width={18} height={18} />
                {pendingProvider === "google" ? "Redirecting to Google..." : "Continue with Google"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
