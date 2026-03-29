export type ExerciseMode = "sentence-translation" | "topic-writing";

export type CriterionScore = {
  key: string;
  label: string;
  score: number;
  weight: number;
  comment: string;
};

type RawCriterionScore = {
  key: string;
  score: number;
  comment: string;
};

export const SENTENCE_CRITERIA = [
  { key: "semantic_accuracy", label: "Semantic Accuracy", weight: 0.35 },
  { key: "grammar_control", label: "Grammar Control", weight: 0.25 },
  { key: "lexical_choice", label: "Lexical Choice", weight: 0.2 },
  { key: "naturalness", label: "Naturalness", weight: 0.2 },
] as const;

export const TOPIC_CRITERIA = [
  { key: "task_response", label: "Task Response", weight: 0.3 },
  { key: "coherence_cohesion", label: "Coherence & Cohesion", weight: 0.25 },
  { key: "lexical_resource", label: "Lexical Resource", weight: 0.2 },
  { key: "grammar_range_accuracy", label: "Grammar Range & Accuracy", weight: 0.25 },
] as const;

export function getCriteriaTemplate(mode: ExerciseMode) {
  return mode === "sentence-translation" ? SENTENCE_CRITERIA : TOPIC_CRITERIA;
}

export function normalizeCriterionScores(
  mode: ExerciseMode,
  raw: RawCriterionScore[]
): CriterionScore[] {
  const template = getCriteriaTemplate(mode);
  const map = new Map(raw.map((item) => [item.key, item]));
  return template.map((criterion) => {
    const source = map.get(criterion.key);
    const score = Math.max(0, Math.min(100, Math.round(source?.score ?? 0)));
    return {
      key: criterion.key,
      label: criterion.label,
      weight: criterion.weight,
      comment: source?.comment?.trim() || "Keep practicing this criterion.",
      score,
    };
  });
}

export function weightedAccuracy(criteria: CriterionScore[]) {
  if (!criteria.length) return 0;
  const weighted = criteria.reduce((sum, item) => sum + item.score * item.weight, 0);
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export function bandFromAccuracy(accuracy: number) {
  const normalized = Math.max(0, Math.min(100, accuracy));
  const band = 1 + (normalized / 100) * 8;
  return Number(Math.min(9, Math.max(1, band)).toFixed(1));
}

export function topWeakCriteria(criteria: CriterionScore[], limit = 2) {
  return [...criteria]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((item) => item.label);
}
