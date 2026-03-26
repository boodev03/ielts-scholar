"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClockCounterClockwise,
  Gear,
  Lifebuoy,
  SignOut,
  Sparkle,
  UserCircle,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUserQuery, useSignOutMutation } from "@/hooks/api/use-auth";
import { useUpdateProfileMutation } from "@/hooks/api/use-profile";
import { authQueryKeys } from "@/hooks/api/use-auth";
import { updateProfileSchema } from "@/types/profile";
import ProfileDialog, { type ProfileDialogValues } from "./ProfileDialog";

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useCurrentUserQuery();
  const signOutMutation = useSignOutMutation();
  const updateProfileMutation = useUpdateProfileMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSeed, setDialogSeed] = useState(0);
  const [initialProfileValues, setInitialProfileValues] = useState<ProfileDialogValues>({
    displayName: "",
    avatarUrl: "",
    nativeLanguage: "Vietnamese",
    targetBand: "7",
    focusSkills: ["speaking", "writing"],
  });

  const user = data?.success ? data.data.user : null;
  const userId = user?.id ?? "";
  const email = user?.email ?? "@guest";
  const plan = user?.plan ?? "Free";

  const handleSignOut = async () => {
    const result = await signOutMutation.mutateAsync();
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  };

  const openProfileDialog = () => {
    setInitialProfileValues({
      displayName: user?.displayName || "",
      avatarUrl: user?.avatarUrl || "",
      nativeLanguage: user?.nativeLanguage || "Vietnamese",
      targetBand: String(user?.targetBand ?? 7),
      focusSkills: user?.focusSkills?.length ? user.focusSkills : ["speaking", "writing"],
    });
    setDialogSeed((prev) => prev + 1);
    setDialogOpen(true);
  };

  const handleUpdateProfile = async (values: ProfileDialogValues) => {
    const payload = {
      displayName: values.displayName,
      avatarUrl: values.avatarUrl,
      nativeLanguage: values.nativeLanguage,
      targetBand: Number(values.targetBand),
      focusSkills: values.focusSkills as Array<
        "listening" | "reading" | "writing" | "speaking" | "vocabulary" | "grammar"
      >,
    };

    const parsed = updateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Please check profile fields again.";
      toast.error(message);
      return;
    }

    const result = await updateProfileMutation.mutateAsync(parsed.data);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
    toast.success("Profile updated.");
    setDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full items-center justify-start gap-2 rounded-xl border border-outline-variant/30 bg-white/70 px-2 py-2 hover:bg-surface-container-low"
          >
            <Avatar className="size-7 border-0 bg-pink-500/80 text-white after:hidden">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.displayName ?? "User"} />
              <AvatarFallback className="bg-transparent text-[10px] font-semibold text-white">
                {getInitials(user?.displayName ?? "Guest")}
              </AvatarFallback>
            </Avatar>
            {!collapsed ? (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium leading-tight text-on-surface">
                    {user?.displayName ?? "Guest"}
                  </p>
                  <p className="truncate text-xs font-medium leading-tight text-on-surface-variant">
                    {plan}
                  </p>
                </div>
                <span className="rounded-full border border-outline-variant/40 px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                  Upgrade
                </span>
              </>
            ) : null}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={collapsed ? "start" : "end"}
          side="top"
          className="w-68 rounded-2xl border border-outline-variant/35 bg-surface-container-lowest p-3 text-on-surface shadow-[0_12px_32px_rgba(25,28,30,0.16)]"
        >
          <div className="flex items-center gap-2.5 px-1 pb-2">
            <Avatar className="size-8 border-0 bg-pink-500/85 text-white after:hidden">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.displayName ?? "User"} />
              <AvatarFallback className="bg-transparent text-[11px] font-semibold text-white">
                {getInitials(user?.displayName ?? "Guest")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-medium leading-tight">{user?.displayName ?? "Guest"}</p>
              <p className="truncate text-sm text-on-surface-variant">{email}</p>
            </div>
          </div>

          <DropdownMenuSeparator className="mx-0 my-1 bg-outline-variant/35" />

          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-on-surface focus:bg-surface-container-low focus:text-on-surface">
            <Sparkle size={18} weight="bold" className="text-on-surface-variant" />
            <span>Upgrade plan</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-on-surface focus:bg-surface-container-low focus:text-on-surface">
            <ClockCounterClockwise size={18} weight="bold" className="text-on-surface-variant" />
            <span>Personalization</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={openProfileDialog}
            className="rounded-lg px-2 py-2 text-[14px] text-on-surface focus:bg-surface-container-low focus:text-on-surface"
          >
            <UserCircle size={18} weight="bold" className="text-on-surface-variant" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-on-surface focus:bg-surface-container-low focus:text-on-surface">
            <Gear size={18} weight="bold" className="text-on-surface-variant" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-0 my-1 bg-outline-variant/35" />

          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-on-surface focus:bg-surface-container-low focus:text-on-surface">
            <Lifebuoy size={18} weight="bold" className="text-on-surface-variant" />
            <span className="flex-1">Help</span>
            <span className="text-on-surface-variant">›</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={signOutMutation.isPending}
            onSelect={handleSignOut}
            className="rounded-lg px-2 py-2 text-[14px] text-on-surface focus:bg-surface-container-low focus:text-on-surface"
          >
            <SignOut size={18} weight="bold" className="text-on-surface-variant" />
            <span>{signOutMutation.isPending ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        key={dialogSeed}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={initialProfileValues}
        saving={updateProfileMutation.isPending || !userId}
        onSave={handleUpdateProfile}
      />
    </>
  );
}
