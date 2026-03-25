"use client";

import {
  getOnboardingStatusService,
  submitOnboardingService,
} from "@/services/onboarding/onboarding.service";
import type { ApiResponse } from "@/types/api";
import type {
  OnboardingInput,
  OnboardingStatusResponse,
  OnboardingSubmitResponse,
} from "@/types/onboarding";

export async function requestOnboardingStatus(): Promise<
  ApiResponse<OnboardingStatusResponse>
> {
  return getOnboardingStatusService();
}

export async function requestSubmitOnboarding(
  payload: OnboardingInput
): Promise<ApiResponse<OnboardingSubmitResponse>> {
  return submitOnboardingService(payload);
}
