export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  native_language: string;
  target_band: number | null;
  proficiency_level: "beginner" | "intermediate" | "advanced" | null;
  study_minutes_per_day: number | null;
  focus_skills: string[];
  exam_date: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VocabularyItem = {
  id: string;
  user_id: string;
  term: string;
  source_text: string | null;
  translation: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Flashcard = {
  id: string;
  user_id: string;
  vocabulary_item_id: string | null;
  front_text: string;
  back_text: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
  updated_at: string;
};
