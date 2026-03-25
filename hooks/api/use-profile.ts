"use client";

import { useMutation } from "@tanstack/react-query";
import { requestUpdateProfile } from "@/requests/profile.request";
import type { UpdateProfileInput } from "@/types/profile";

export function useUpdateProfileMutation() {
  return useMutation({
    mutationFn: (payload: UpdateProfileInput) => requestUpdateProfile(payload),
  });
}
