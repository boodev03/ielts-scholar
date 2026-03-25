"use server";

import { createClient } from "@/lib/supabase/server";
import { apiFailure, apiSuccess, type ApiResponse } from "@/types/api";
import {
  onboardingSchema,
  type OnboardingInput,
  type OnboardingStatusResponse,
  type OnboardingSubmitResponse,
} from "@/types/onboarding";

type ProfileRow = {
  onboarding_completed: boolean | null;
};

export async function getOnboardingStatusService(): Promise<
  ApiResponse<OnboardingStatusResponse>
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    return apiFailure("SUPABASE_ERROR", error.message);
  }

  return apiSuccess({ completed: Boolean(data?.onboarding_completed) });
}

export async function submitOnboardingService(
  rawInput: unknown
): Promise<ApiResponse<OnboardingSubmitResponse>> {
  const parsed = onboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid onboarding payload.",
      parsed.error.flatten()
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const payload: OnboardingInput = parsed.data;
  const { error } = await supabase.from("user_profiles").upsert({
    id: user.id,
    display_name: payload.displayName,
    native_language: payload.nativeLanguage,
    target_band: payload.targetBand,
    proficiency_level: payload.proficiencyLevel,
    study_minutes_per_day: payload.studyMinutesPerDay,
    focus_skills: payload.focusSkills,
    exam_date: payload.examDate || null,
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
  });

  if (error) {
    return apiFailure("SUPABASE_ERROR", error.message);
  }

  return apiSuccess({ completed: true });
}
