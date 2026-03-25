import { exchangeCodeForSessionService } from "@/services/auth/auth.service";
import { redirect } from "next/navigation";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const { code, next } = await searchParams;

  if (code) {
    await exchangeCodeForSessionService(code);
  }

  redirect(next || "/chat");
}
