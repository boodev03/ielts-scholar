import { getCurrentUserService } from "@/services/auth/auth.service";
import { redirect } from "next/navigation";

export default async function PlanLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUserState = await getCurrentUserService();
  if (!currentUserState.success || !currentUserState.data.user) {
    redirect("/login");
  }

  if (!currentUserState.data.user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return children;
}
