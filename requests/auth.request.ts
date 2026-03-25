"use client";

import {
  getCurrentUserService,
  googleSignInService,
  signOutService,
  signInWithPasswordService,
  signUpWithPasswordService,
} from "@/services/auth/auth.service";
import type {
  CurrentUserResponse,
  GoogleAuthInput,
  SignInInput,
  SignInResponse,
  SignUpInput,
  SignUpResponse,
} from "@/types/auth";
import type { ApiResponse } from "@/types/api";

export async function requestSignIn(
  payload: SignInInput
): Promise<ApiResponse<SignInResponse>> {
  return signInWithPasswordService(payload);
}

export async function requestSignUp(
  payload: SignUpInput
): Promise<ApiResponse<SignUpResponse>> {
  return signUpWithPasswordService(payload);
}

export async function requestGoogleSignIn(
  payload: GoogleAuthInput
): Promise<ApiResponse<{ url: string }>> {
  return googleSignInService(payload);
}

export async function requestCurrentUser(): Promise<ApiResponse<CurrentUserResponse>> {
  return getCurrentUserService();
}

export async function requestSignOut(): Promise<ApiResponse<null>> {
  return signOutService();
}
