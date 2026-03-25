import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

export const signUpSchema = signInSchema
  .extend({
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const googleAuthSchema = z.object({
  redirectTo: z.url().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export type AuthUser = {
  id: string;
  email: string;
};

export type SignInResponse = {
  user: AuthUser;
};

export type SignUpResponse = {
  user: AuthUser | null;
  requiresEmailVerification: boolean;
};

export type GoogleAuthResponse = {
  url: string;
};

export type SessionResponse = {
  user: AuthUser | null;
};

export type SidebarUserResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
    plan: "Free";
  } | null;
};

export type CurrentUserResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    nativeLanguage: string;
    targetBand: number | null;
    focusSkills: string[];
    plan: "Free";
    onboardingCompleted: boolean;
  } | null;
};
