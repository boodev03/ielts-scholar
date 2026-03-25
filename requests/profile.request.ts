"use client";

import { updateProfileService } from "@/services/profile/profile.service";
import type { ApiResponse } from "@/types/api";
import type { UpdateProfileInput, UpdateProfileResponse } from "@/types/profile";

export async function requestUpdateProfile(
  payload: UpdateProfileInput
): Promise<ApiResponse<UpdateProfileResponse>> {
  return updateProfileService(payload);
}
