"use client";

import type { CSSProperties } from "react";
import Sidebar from "../layouts/Sidebar";
import LearningInsights from "../modules/chat/LearningInsights";
import { SidebarProvider } from "@/components/ui/sidebar";
import ChatArea from "../modules/chat/ChatArea";

export default function ChatScreen({
  conversationId,
}: {
  conversationId?: string | null;
}) {
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
        <ChatArea conversationId={conversationId} />
        <LearningInsights />
      </div>
    </SidebarProvider>
  );
}
