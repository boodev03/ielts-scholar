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

export type DictionaryEntry = {
  partOfSpeech: string;
  translation: string;
  meanings: string[];
  examples: string[];
};

export type VocabularyItem = {
  id: string;
  user_id: string;
  term: string;
  source_text: string | null;
  ipa: string | null;
  translation: string | null;
  entries: DictionaryEntry[];
  notes: string[];
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

export type ChatProject = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatConversation = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  last_message_preview: string | null;
  last_activity_at: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WritingPracticeAttempt = {
  id: string;
  user_id: string;
  exercise_mode: "sentence-translation" | "topic-writing" | "speaking-live";
  overall_accuracy: number;
  band_score: number;
  criterion_scores: Array<{
    key: string;
    label: string;
    score: number;
    weight: number;
    comment: string;
  }>;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StudyPlanDay = {
  id: string;
  user_id: string;
  plan_date: string;
  day_type: "weekday" | "weekend";
  target_minutes: number;
  is_mock_day: boolean;
  created_at: string;
  updated_at: string;
};

export type StudyPlanItem = {
  id: string;
  user_id: string;
  plan_day_id: string;
  title: string;
  description: string | null;
  focus_area: string;
  task_type: "writing" | "speaking" | "vocabulary" | "grammar" | "mock-test";
  weakness_key: string | null;
  weakness_label: string | null;
  planned_minutes: number;
  status: "pending" | "done";
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
