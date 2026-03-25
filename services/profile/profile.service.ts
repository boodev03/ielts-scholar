"use server";

import { createClient } from "@/lib/supabase/server";
import { apiFailure, apiSuccess, type ApiResponse } from "@/types/api";
import {
  updateProfileSchema,
  type UpdateProfileInput,
  type UpdateProfileResponse,
} from "@/types/profile";

export async function updateProfileService(
  rawInput: unknown
): Promise<ApiResponse<UpdateProfileResponse>> {
  const parsed = updateProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid profile payload.",
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

  const payload: UpdateProfileInput = parsed.data;
  const { error } = await supabase.from("user_profiles").upsert({
    id: user.id,
    display_name: payload.displayName,
    avatar_url: payload.avatarUrl || null,
    native_language: payload.nativeLanguage,
    target_band: payload.targetBand,
    focus_skills: payload.focusSkills,
  });

  if (error) {
    return apiFailure("SUPABASE_ERROR", error.message);
  }

  return apiSuccess({ updated: true });
}
