"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Sidebar from "../layouts/Sidebar";
import LearningInsights from "../modules/chat/LearningInsights";
import { SidebarProvider } from "@/components/ui/sidebar";
import ChatArea from "../modules/chat/ChatArea";

export default function ChatPage() {
  const [flashcardWords, setFlashcardWords] = useState<string[]>([]);

  const handleAddFlashcard = (word: string) => {
    const normalized = word.trim();
    if (!normalized) return false;

    let added = false;
    setFlashcardWords((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === normalized.toLowerCase()
      );
      if (exists) return prev;
      added = true;
      return [normalized, ...prev];
    });

    return added;
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
          "--sidebar-width-icon": "64px",
        } as CSSProperties
      }
      className="h-full"
    >
      <div
        className="flex h-full overflow-hidden flex-1"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <Sidebar />
        <ChatArea onAddFlashcard={handleAddFlashcard} />
        <LearningInsights flashcardWords={flashcardWords} />
      </div>
    </SidebarProvider>
  );
}
