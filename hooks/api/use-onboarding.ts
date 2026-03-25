"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  requestOnboardingStatus,
  requestSubmitOnboarding,
} from "@/requests/onboarding.request";
import type { OnboardingInput } from "@/types/onboarding";

export const onboardingQueryKeys = {
  status: ["onboarding", "status"] as const,
};

export function useOnboardingStatusQuery() {
  return useQuery({
    queryKey: onboardingQueryKeys.status,
    queryFn: requestOnboardingStatus,
  });
}

export function useSubmitOnboardingMutation() {
  return useMutation({
    mutationFn: (payload: OnboardingInput) => requestSubmitOnboarding(payload),
  });
}
