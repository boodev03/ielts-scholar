import { z } from "zod";

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(60, "Display name is too long."),
  nativeLanguage: z
    .string()
    .trim()
    .min(2, "Native language is required.")
    .max(40, "Native language is too long."),
  targetBand: z
    .number()
    .min(1, "Target band must be between 1 and 9.")
    .max(9, "Target band must be between 1 and 9."),
  proficiencyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  studyMinutesPerDay: z
    .number()
    .int()
    .min(10, "Study time should be at least 10 minutes.")
    .max(600, "Study time should be less than 600 minutes."),
  focusSkills: z
    .array(z.enum(["listening", "reading", "writing", "speaking", "vocabulary", "grammar"]))
    .min(1, "Select at least one focus skill.")
    .max(4, "Select up to 4 focus skills."),
  examDate: z.string().optional(),
});

export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type OnboardingStatusResponse = {
  completed: boolean;
};

export type OnboardingSubmitResponse = {
  completed: boolean;
};
