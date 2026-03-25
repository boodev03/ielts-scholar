import { getCurrentUserService } from "@/services/auth/auth.service";
import { redirect } from "next/navigation";
import AuthScreen from "../modules/auth/AuthScreen";

export default async function LoginPage() {
  const currentUserState = await getCurrentUserService();
  if (currentUserState.success && currentUserState.data.user) {
    if (currentUserState.data.user.onboardingCompleted) {
      redirect("/chat");
    }
    redirect("/onboarding");
  }

  return <AuthScreen mode="login" />;
}
