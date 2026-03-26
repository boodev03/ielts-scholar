"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubmitOnboardingMutation } from "@/hooks/api/use-onboarding";
import { onboardingSchema, type OnboardingInput } from "@/types/onboarding";

const STEPS = [
  { id: "profile", title: "Your profile", subtitle: "Tell us about your background." },
  { id: "goals", title: "Your goals", subtitle: "Set your IELTS target and timeline." },
  { id: "study", title: "How you study", subtitle: "Define habits so we personalize coaching." },
  { id: "review", title: "Review", subtitle: "Check details before starting your learning path." },
] as const;

const SKILL_OPTIONS: Array<{
  label: string;
  value: OnboardingInput["focusSkills"][number];
}> = [
  { label: "Listening", value: "listening" },
  { label: "Reading", value: "reading" },
  { label: "Writing", value: "writing" },
  { label: "Speaking", value: "speaking" },
  { label: "Vocabulary", value: "vocabulary" },
  { label: "Grammar", value: "grammar" },
];

const profileStepSchema = onboardingSchema.pick({
  displayName: true,
  nativeLanguage: true,
});

const goalsStepSchema = onboardingSchema.pick({
  targetBand: true,
  proficiencyLevel: true,
});

const studyStepSchema = onboardingSchema.pick({
  studyMinutesPerDay: true,
  focusSkills: true,
});

export default function OnboardingForm() {
  const router = useRouter();
  const submitMutation = useSubmitOnboardingMutation();
  const [step, setStep] = useState(0);

  const form = useForm<OnboardingInput>({
    defaultValues: {
      displayName: "",
      nativeLanguage: "Vietnamese",
      targetBand: 7,
      proficiencyLevel: "intermediate",
      studyMinutesPerDay: 60,
      focusSkills: ["speaking", "writing"],
      examDate: "",
    },
  });

  const values = useWatch({ control: form.control });
  const loading = submitMutation.isPending;

  const reviewItems = useMemo(
    () => [
      { label: "Display name", value: values.displayName || "Not set" },
      { label: "Native language", value: values.nativeLanguage || "Not set" },
      { label: "Target band", value: values.targetBand ? `Band ${values.targetBand}` : "Not set" },
      { label: "Level", value: values.proficiencyLevel || "Not set" },
      {
        label: "Study time",
        value: values.studyMinutesPerDay ? `${values.studyMinutesPerDay} min/day` : "Not set",
      },
      {
        label: "Focus skills",
        value: values.focusSkills?.length ? values.focusSkills.join(", ") : "Not set",
      },
    ],
    [values]
  );

  const setStepErrors = (errors: Record<string, string[] | undefined>) => {
    if (errors.displayName?.[0]) form.setError("displayName", { message: errors.displayName[0] });
    if (errors.nativeLanguage?.[0]) {
      form.setError("nativeLanguage", { message: errors.nativeLanguage[0] });
    }
    if (errors.targetBand?.[0]) form.setError("targetBand", { message: errors.targetBand[0] });
    if (errors.proficiencyLevel?.[0]) {
      form.setError("proficiencyLevel", { message: errors.proficiencyLevel[0] });
    }
    if (errors.studyMinutesPerDay?.[0]) {
      form.setError("studyMinutesPerDay", { message: errors.studyMinutesPerDay[0] });
    }
    if (errors.focusSkills?.[0]) form.setError("focusSkills", { message: errors.focusSkills[0] });
  };

  const validateCurrentStep = (): boolean => {
    const currentValues = form.getValues();

    let result;
    if (step === 0) {
      result = profileStepSchema.safeParse(currentValues);
    } else if (step === 1) {
      result = goalsStepSchema.safeParse(currentValues);
    } else if (step === 2) {
      result = studyStepSchema.safeParse(currentValues);
    } else {
      result = onboardingSchema.safeParse(currentValues);
    }

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setStepErrors(fieldErrors);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    form.clearErrors();
    if (!validateCurrentStep()) return;

    if (step === STEPS.length - 1) {
      const payload = form.getValues();
      const parsed = onboardingSchema.safeParse(payload);
      if (!parsed.success) {
        setStepErrors(parsed.error.flatten().fieldErrors);
        return;
      }
      const result = await submitMutation.mutateAsync(parsed.data);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const welcomeName = parsed.data.displayName?.trim() || "there";
      toast.success(`Welcome ${welcomeName}! Your learning path is ready.`);
      router.push("/chat");
      return;
    }

    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const selectedFocusSkills = values.focusSkills ?? [];

  const toggleFocusSkill = (value: OnboardingInput["focusSkills"][number]) => {
    const current = selectedFocusSkills;
    if (current.includes(value)) {
      form.setValue(
        "focusSkills",
        current.filter((item) => item !== value),
        { shouldDirty: true }
      );
      return;
    }
    if (current.length >= 4) {
      toast.warning("You can select up to 4 focus skills.");
      return;
    }
    form.setValue("focusSkills", [...current, value], { shouldDirty: true });
  };

  return (
    <div className="mx-auto w-full max-w-[460px]">
      {/* Step dots */}
      <div className="mb-5 flex items-center justify-center gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className="block rounded-full transition-all duration-300"
            style={{
              width: i === step ? "20px" : "6px",
              height: "6px",
              backgroundColor: i <= step ? "#5ec07e" : "#c7cecb",
            }}
          />
        ))}
      </div>

      {/* Card — height fits content */}
      <div className="w-full rounded-[2rem] border border-outline-variant/35 bg-white/90 p-6 shadow-[0_30px_90px_rgba(0,69,50,0.12)] backdrop-blur sm:p-8">
        {/* Heading */}
        <div className="mb-6">
          <h1
            className="text-[28px] font-semibold leading-[1.15] text-[#0e1512]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {STEPS[step].title}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-[#5b6460]">{STEPS[step].subtitle}</p>
        </div>

        {/* Step 0 — Profile */}
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#5b6460]">Display name</span>
              <Input
                disabled={loading}
                placeholder="Your name"
                {...form.register("displayName")}
                className="h-11 rounded-xl border-[#d6ddda] bg-[#f8faf9] px-3 text-sm focus-visible:ring-[#5ec07e]/40"
              />
              <p className="text-xs text-red-500">{form.formState.errors.displayName?.message}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#5b6460]">Native language</span>
              <Input
                disabled={loading}
                placeholder="Vietnamese"
                {...form.register("nativeLanguage")}
                className="h-11 rounded-xl border-[#d6ddda] bg-[#f8faf9] px-3 text-sm focus-visible:ring-[#5ec07e]/40"
              />
              <p className="text-xs text-red-500">{form.formState.errors.nativeLanguage?.message}</p>
            </div>
          </div>
        )}

        {/* Step 1 — Goals */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#5b6460]">Target band</span>
              <Input
                disabled={loading}
                type="number"
                min={1}
                max={9}
                step={0.5}
                {...form.register("targetBand", { valueAsNumber: true })}
                className="h-12 rounded-xl border-[#d6ddda] bg-[#f8faf9] px-3 text-sm focus-visible:ring-[#5ec07e]/40"
              />
              <p className="text-xs text-red-500">{form.formState.errors.targetBand?.message}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#5b6460]">Level</span>
              <Select
                disabled={loading}
                value={values.proficiencyLevel}
                onValueChange={(value) =>
                  form.setValue(
                    "proficiencyLevel",
                    value as OnboardingInput["proficiencyLevel"],
                    {
                      shouldDirty: true,
                    }
                  )
                }
              >
                <SelectTrigger className="h-12 min-h-12 w-full rounded-xl border-[#d6ddda] bg-[#f8faf9] px-3 text-sm">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-red-500">{form.formState.errors.proficiencyLevel?.message}</p>
            </div>

          </div>
        )}

        {/* Step 2 — Study habits */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#5b6460]">Study minutes per day</span>
              <Input
                disabled={loading}
                type="number"
                min={10}
                max={600}
                {...form.register("studyMinutesPerDay", { valueAsNumber: true })}
                className="h-11 rounded-xl border-[#d6ddda] bg-[#f8faf9] px-3 text-sm focus-visible:ring-[#5ec07e]/40"
              />
              <p className="text-xs text-red-500">{form.formState.errors.studyMinutesPerDay?.message}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#5b6460]">Focus skills (up to 4)</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((item) => {
                  const active = selectedFocusSkills.includes(item.value);
                  return (
                    <Button
                      key={item.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => toggleFocusSkill(item.value)}
                      className={`h-8 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? "border-[#4fb16f] bg-[#5ec07e] text-[#0f2417] shadow-sm hover:bg-[#5ec07e]"
                          : "border-[#d6ddda] bg-white text-[#1b2420] hover:border-[#5ec07e]/50 hover:bg-white"
                      }`}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-red-500">{form.formState.errors.focusSkills?.message}</p>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#d6ddda] bg-gradient-to-br from-[#eff8f3] to-[#f8fbf9] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#0d7a42]">
                <CheckCircle size={16} weight="fill" />
                <p className="text-xs font-semibold">Ready to personalize your learning plan</p>
              </div>
              <p className="text-xs leading-5 text-[#4f5b56]">
                This profile helps the AI choose task difficulty, vocabulary depth, and feedback style
                that matches your current level and target band.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {reviewItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#d6ddda] bg-[#f8faf9] p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8fa39c]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0e1512]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#d6ddda] bg-white p-3">
              <p className="text-[11px] text-[#5b6460]">
                You can always update these preferences later from settings.
              </p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleBack}
              className="h-11 flex-1 rounded-xl border-[#d6ddda] bg-white text-sm text-[#14201a] hover:bg-[#f0f5f2]"
            >
              <ArrowLeft size={15} weight="bold" />
              Back
            </Button>
          )}

          <Button
            type="button"
            disabled={loading}
            onClick={handleNext}
            className="h-11 flex-1 rounded-xl bg-[#5ec07e] text-sm font-semibold text-[#0f2417] hover:bg-[#4fb16f] active:scale-[0.98]"
          >
            {step === STEPS.length - 1 ? "Complete" : "Get Started"}
            <ArrowRight size={15} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );
}
