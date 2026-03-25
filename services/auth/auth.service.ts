"use server";

import { createClient } from "@/lib/supabase/server";
import {
  googleAuthSchema,
  signInSchema,
  signUpSchema,
  type AuthUser,
  type CurrentUserResponse,
  type GoogleAuthResponse,
  type SignInResponse,
  type SignUpResponse,
} from "@/types/auth";
import { apiFailure, apiSuccess, type ApiErrorCode, type ApiResponse } from "@/types/api";

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return { id: user.id, email: user.email ?? "" };
}

function mapSupabaseAuthError(status?: number, message?: string): ApiErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (message?.toLowerCase().includes("invalid login credentials")) {
    return "UNAUTHORIZED";
  }
  return "SUPABASE_ERROR";
}

type AuthContext = {
  user: AuthUser | null;
  email: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    nativeLanguage: string | null;
    targetBand: number | null;
    focusSkills: string[];
    onboardingCompleted: boolean;
  } | null;
};

async function getCurrentAuthContext(options?: {
  includeProfile?: boolean;
}): Promise<ApiResponse<AuthContext>> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return apiFailure(
      mapSupabaseAuthError(error.status, error.message),
      error.message ?? "Unable to retrieve session."
    );
  }

  if (!data.user) {
    return apiSuccess({
      user: null,
      email: null,
      profile: null,
    });
  }

  if (!options?.includeProfile) {
    return apiSuccess({
      user: toAuthUser(data.user),
      email: data.user.email ?? null,
      profile: null,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url, native_language, target_band, focus_skills, onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle<{
      display_name: string | null;
      avatar_url: string | null;
      native_language: string | null;
      target_band: number | null;
      focus_skills: string[] | null;
      onboarding_completed: boolean | null;
    }>();

  if (profileError) {
    return apiFailure("SUPABASE_ERROR", profileError.message);
  }

  return apiSuccess({
    user: toAuthUser(data.user),
    email: data.user.email ?? null,
    profile: {
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      nativeLanguage: profile?.native_language ?? null,
      targetBand: profile?.target_band ?? null,
      focusSkills: profile?.focus_skills ?? [],
      onboardingCompleted: Boolean(profile?.onboarding_completed),
    },
  });
}

export async function signInWithPasswordService(
  rawInput: unknown
): Promise<ApiResponse<SignInResponse>> {
  const parsed = signInSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure("VALIDATION_ERROR", "Invalid sign-in payload.", parsed.error.flatten());
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return apiFailure(
      mapSupabaseAuthError(error?.status, error?.message),
      error?.message ?? "Unable to sign in."
    );
  }

  return apiSuccess({ user: toAuthUser(data.user) });
}

export async function signUpWithPasswordService(
  rawInput: unknown
): Promise<ApiResponse<SignUpResponse>> {
  const parsed = signUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure("VALIDATION_ERROR", "Invalid sign-up payload.", parsed.error.flatten());
  }

  const supabase = await createClient();
  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return apiFailure(
      mapSupabaseAuthError(error.status, error.message),
      error.message ?? "Unable to sign up."
    );
  }

  const user = data.user ? toAuthUser(data.user) : null;
  const requiresEmailVerification = !data.session;

  return apiSuccess({ user, requiresEmailVerification });
}

export async function googleSignInService(
  rawInput: unknown
): Promise<ApiResponse<GoogleAuthResponse>> {
  const parsed = googleAuthSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return apiFailure("VALIDATION_ERROR", "Invalid Google sign-in payload.", parsed.error.flatten());
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        parsed.data.redirectTo ??
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return apiFailure(
      mapSupabaseAuthError(error?.status, error?.message),
      error?.message ?? "Unable to start Google sign-in."
    );
  }

  return apiSuccess({ url: data.url });
}

export async function getCurrentUserService(): Promise<ApiResponse<CurrentUserResponse>> {
  const context = await getCurrentAuthContext({ includeProfile: true });
  if (!context.success) return context;

  if (!context.data.user) {
    return apiSuccess({ user: null });
  }

  return apiSuccess({
    user: {
      id: context.data.user.id,
      email: context.data.user.email,
      displayName:
        context.data.profile?.displayName?.trim() ||
        context.data.email?.split("@")[0] ||
        "User",
      avatarUrl: context.data.profile?.avatarUrl ?? null,
      nativeLanguage: context.data.profile?.nativeLanguage ?? "Vietnamese",
      targetBand: context.data.profile?.targetBand ?? null,
      focusSkills: context.data.profile?.focusSkills ?? [],
      plan: "Free",
      onboardingCompleted: Boolean(context.data.profile?.onboardingCompleted),
    },
  });
}

export async function exchangeCodeForSessionService(code: string): Promise<ApiResponse<null>> {
  if (!code) {
    return apiFailure("VALIDATION_ERROR", "Missing code.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return apiFailure(
      mapSupabaseAuthError(error.status, error.message),
      error.message ?? "Failed to complete OAuth callback."
    );
  }

  return apiSuccess(null);
}

export async function signOutService(): Promise<ApiResponse<null>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return apiFailure(
      mapSupabaseAuthError(error.status, error.message),
      error.message ?? "Failed to log out."
    );
  }

  return apiSuccess(null);
}
