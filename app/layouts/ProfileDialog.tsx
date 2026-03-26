"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SKILL_OPTIONS = [
  { label: "Listening", value: "listening" },
  { label: "Reading", value: "reading" },
  { label: "Writing", value: "writing" },
  { label: "Speaking", value: "speaking" },
  { label: "Vocabulary", value: "vocabulary" },
  { label: "Grammar", value: "grammar" },
] as const;

export type ProfileDialogValues = {
  displayName: string;
  avatarUrl: string;
  nativeLanguage: string;
  targetBand: string;
  focusSkills: string[];
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileDialog({
  open,
  onOpenChange,
  initialValues,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: ProfileDialogValues;
  saving: boolean;
  onSave: (values: ProfileDialogValues) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(initialValues.displayName);
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl);
  const [targetBand, setTargetBand] = useState(initialValues.targetBand);
  const [nativeLanguage, setNativeLanguage] = useState(initialValues.nativeLanguage);
  const [focusSkills, setFocusSkills] = useState<string[]>(initialValues.focusSkills);

  const previewAvatar = useMemo(() => avatarUrl || "", [avatarUrl]);

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

  const handleChooseAvatarFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Image is too large. Please use a file under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) return;
      setAvatarUrl(value);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    await onSave({
      displayName,
      avatarUrl,
      nativeLanguage,
      targetBand,
      focusSkills,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-outline-variant/40 bg-surface-container-lowest p-0 shadow-none sm:max-w-xl">
        <DialogHeader className="space-y-1 border-b border-outline-variant/30 px-6 py-5">
          <DialogTitle className="text-lg font-semibold text-on-surface">Profile</DialogTitle>
          <DialogDescription className="text-sm text-on-surface-variant">
            Update your learning profile and avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div className="flex justify-center">
            <label className="group/avatar relative block h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-outline-variant/35">
              <Avatar className="size-24 border-0 bg-primary-container text-primary after:hidden">
                <AvatarImage src={previewAvatar || undefined} alt={displayName || "User"} />
                <AvatarFallback className="bg-transparent text-base font-semibold text-primary">
                  {getInitials(displayName || "User")}
                </AvatarFallback>
              </Avatar>

              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold tracking-wide text-white opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100">
                Upload
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleChooseAvatarFile(e.target.files?.[0])}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-display-name">Display name</Label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-11 rounded-xl border-outline-variant/50 bg-surface-container-lowest px-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-native-language">Native language</Label>
              <Input
                id="profile-native-language"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="h-11 rounded-xl border-outline-variant/50 bg-surface-container-lowest px-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-target-band">Target band</Label>
            <Input
              id="profile-target-band"
              type="number"
              min={1}
              max={9}
              step={0.5}
              value={targetBand}
              onChange={(e) => setTargetBand(e.target.value)}
              className="h-11 rounded-xl border-outline-variant/50 bg-surface-container-lowest px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Focus skills</Label>
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
                        : "border-outline-variant/50 bg-white text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-outline-variant/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-10 rounded-xl bg-primary text-white hover:bg-primary-fixed-variant"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
