"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  requestCurrentUser,
  requestGoogleSignIn,
  requestSignOut,
  requestSignIn,
  requestSignUp,
} from "@/requests/auth.request";
import type { GoogleAuthInput, SignInInput, SignUpInput } from "@/types/auth";

export const authQueryKeys = {
  currentUser: ["auth", "current-user"] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: requestCurrentUser,
  });
}

export function useSignInMutation() {
  return useMutation({
    mutationFn: (payload: SignInInput) => requestSignIn(payload),
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: (payload: SignUpInput) => requestSignUp(payload),
  });
}

export function useGoogleSignInMutation() {
  return useMutation({
    mutationFn: (payload: GoogleAuthInput) => requestGoogleSignIn(payload),
  });
}

export function useSignOutMutation() {
  return useMutation({
    mutationFn: requestSignOut,
  });
}
