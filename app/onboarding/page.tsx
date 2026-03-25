import { getCurrentUserService } from "@/services/auth/auth.service";
import OnboardingForm from "../modules/onboarding/OnboardingForm";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const currentUserState = await getCurrentUserService();
  if (!currentUserState.success || !currentUserState.data.user) {
    redirect("/login");
  }

  if (currentUserState.data.user.onboardingCompleted) {
    redirect("/chat");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-surface)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-14 -top-10 h-72 w-72 rounded-full bg-[var(--color-primary-container)] blur-3xl" />
        <div className="absolute -right-10 top-20 h-72 w-72 rounded-full bg-[#d6f8e3] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#e9f8ff] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <OnboardingForm />
      </div>
    </main>
  );
}
