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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCurrentUserQuery, useSignOutMutation } from "@/hooks/api/use-auth";
import { useUpdateProfileMutation } from "@/hooks/api/use-profile";
import { authQueryKeys } from "@/hooks/api/use-auth";
import { updateProfileSchema } from "@/types/profile";

const SKILL_OPTIONS = [
  { label: "Listening", value: "listening" },
  { label: "Reading", value: "reading" },
  { label: "Writing", value: "writing" },
  { label: "Speaking", value: "speaking" },
  { label: "Vocabulary", value: "vocabulary" },
  { label: "Grammar", value: "grammar" },
] as const;

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
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [targetBand, setTargetBand] = useState("7");
  const [nativeLanguage, setNativeLanguage] = useState("Vietnamese");
  const [focusSkills, setFocusSkills] = useState<string[]>(["speaking", "writing"]);

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

  const toggleFocusSkill = (value: string) => {
    if (focusSkills.includes(value)) {
      setFocusSkills((prev) => prev.filter((item) => item !== value));
      return;
    }
    if (focusSkills.length >= 4) {
      toast.warning("You can select up to 4 focus skills.");
      return;
    }
    setFocusSkills((prev) => [...prev, value]);
  };

  const openProfileDialog = () => {
    setDisplayName(user?.displayName || "");
    setAvatarUrl(user?.avatarUrl || "");
    setTargetBand(String(user?.targetBand ?? 7));
    setNativeLanguage(user?.nativeLanguage || "Vietnamese");
    setFocusSkills(user?.focusSkills?.length ? user.focusSkills : ["speaking", "writing"]);
    setDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    const payload = {
      displayName,
      avatarUrl,
      nativeLanguage,
      targetBand: Number(targetBand),
      focusSkills: focusSkills as Array<
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
            className="h-auto w-full items-center justify-start gap-2 rounded-xl border border-[color:var(--color-outline-variant)]/30 bg-white/70 px-2 py-2 hover:bg-[var(--color-surface-container-low)]"
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
                  <p className="truncate text-sm font-medium leading-tight text-[var(--color-on-surface)]">
                    {user?.displayName ?? "Guest"}
                  </p>
                  <p className="truncate text-xs font-medium leading-tight text-[var(--color-on-surface-variant)]">
                    {plan}
                  </p>
                </div>
                <span className="rounded-full border border-[color:var(--color-outline-variant)]/40 px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                  Upgrade
                </span>
              </>
            ) : null}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={collapsed ? "start" : "end"}
          side="top"
          className="w-68 rounded-2xl border border-[color:var(--color-outline-variant)]/35 bg-[var(--color-surface-container-lowest)] p-3 text-[var(--color-on-surface)] shadow-[0_12px_32px_rgba(25,28,30,0.16)]"
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
              <p className="truncate text-sm text-[var(--color-on-surface-variant)]">{email}</p>
            </div>
          </div>

          <DropdownMenuSeparator className="mx-0 my-1 bg-[color:var(--color-outline-variant)]/35" />

          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-[var(--color-on-surface)] focus:bg-[var(--color-surface-container-low)] focus:text-[var(--color-on-surface)]">
            <Sparkle size={18} weight="bold" className="text-[var(--color-on-surface-variant)]" />
            <span>Upgrade plan</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-[var(--color-on-surface)] focus:bg-[var(--color-surface-container-low)] focus:text-[var(--color-on-surface)]">
            <ClockCounterClockwise size={18} weight="bold" className="text-[var(--color-on-surface-variant)]" />
            <span>Personalization</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={openProfileDialog}
            className="rounded-lg px-2 py-2 text-[14px] text-[var(--color-on-surface)] focus:bg-[var(--color-surface-container-low)] focus:text-[var(--color-on-surface)]"
          >
            <UserCircle size={18} weight="bold" className="text-[var(--color-on-surface-variant)]" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-[var(--color-on-surface)] focus:bg-[var(--color-surface-container-low)] focus:text-[var(--color-on-surface)]">
            <Gear size={18} weight="bold" className="text-[var(--color-on-surface-variant)]" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-0 my-1 bg-[color:var(--color-outline-variant)]/35" />

          <DropdownMenuItem className="rounded-lg px-2 py-2 text-[14px] text-[var(--color-on-surface)] focus:bg-[var(--color-surface-container-low)] focus:text-[var(--color-on-surface)]">
            <Lifebuoy size={18} weight="bold" className="text-[var(--color-on-surface-variant)]" />
            <span className="flex-1">Help</span>
            <span className="text-[var(--color-on-surface-variant)]">›</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={signOutMutation.isPending}
            onSelect={handleSignOut}
            className="rounded-lg px-2 py-2 text-[14px] text-[var(--color-on-surface)] focus:bg-[var(--color-surface-container-low)] focus:text-[var(--color-on-surface)]"
          >
            <SignOut size={18} weight="bold" className="text-[var(--color-on-surface-variant)]" />
            <span>{signOutMutation.isPending ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border-[color:var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-[color:var(--color-outline-variant)]/35 px-5 py-4">
            <DialogTitle className="text-lg font-semibold">Update Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border-0 bg-pink-500/85 text-white after:hidden">
                <AvatarImage src={avatarUrl || undefined} alt={displayName || "User"} />
                <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                  {getInitials(displayName || "User")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">Avatar URL</p>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-10 rounded-xl border-[color:var(--color-outline-variant)]/50 bg-[var(--color-surface-container-lowest)] px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Display name</span>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-10 rounded-xl border-[color:var(--color-outline-variant)]/50 bg-[var(--color-surface-container-lowest)] px-3 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Native language</span>
                <Input
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  className="h-10 rounded-xl border-[color:var(--color-outline-variant)]/50 bg-[var(--color-surface-container-lowest)] px-3 text-sm"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Target band</span>
              <Input
                type="number"
                min={1}
                max={9}
                step={0.5}
                value={targetBand}
                onChange={(e) => setTargetBand(e.target.value)}
                className="h-10 rounded-xl border-[color:var(--color-outline-variant)]/50 bg-[var(--color-surface-container-lowest)] px-3 text-sm"
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">Focus skills</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((item) => {
                  const active = focusSkills.includes(item.value);
                  return (
                    <Button
                      key={item.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFocusSkill(item.value)}
                      className={`h-8 rounded-full px-3 text-xs ${
                        active
                          ? "border-[#4fb16f] bg-[#5ec07e] text-[#0f2417] hover:bg-[#5ec07e]"
                          : "border-[color:var(--color-outline-variant)]/50 bg-white text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)]"
                      }`}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[color:var(--color-outline-variant)]/35 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateProfileMutation.isPending || !userId}
              onClick={handleUpdateProfile}
              className="h-10 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-fixed-variant)]"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
