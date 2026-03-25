import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(60, "Display name is too long."),
  avatarUrl: z.url("Avatar URL must be a valid URL.").or(z.literal("")),
  nativeLanguage: z
    .string()
    .trim()
    .min(2, "Native language is required.")
    .max(40, "Native language is too long."),
  targetBand: z
    .number()
    .min(1, "Target band must be between 1 and 9.")
    .max(9, "Target band must be between 1 and 9."),
  focusSkills: z
    .array(z.enum(["listening", "reading", "writing", "speaking", "vocabulary", "grammar"]))
    .min(1, "Select at least one focus skill.")
    .max(4, "Select up to 4 focus skills."),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type UpdateProfileResponse = {
  updated: true;
};
