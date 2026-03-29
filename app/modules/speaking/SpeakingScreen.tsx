"use client";

import Sidebar from "@/app/layouts/Sidebar";
import { SpeakingPracticeLabScreenInner } from "@/app/modules/speaking/SpeakingPracticeLabScreen";
import { SpeakingRoomScreenInner } from "@/app/modules/speaking/SpeakingRoomScreen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MicrophoneStage, Waveform } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { useState } from "react";

type SpeakingType = "room" | "practice";

export default function SpeakingScreen() {
  const [type, setType] = useState<SpeakingType>("room");

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
      <div className="flex h-full flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar />
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <div className="px-4 pb-2 pt-5 sm:px-6 lg:px-8">
            <Card className="mx-auto w-full max-w-6xl rounded-2xl border-outline-variant/30 bg-surface-container-lowest p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={type === "room" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setType("room")}
                >
                  <MicrophoneStage size={16} weight="bold" />
                  Speaking Room
                </Button>
                <Button
                  type="button"
                  variant={type === "practice" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setType("practice")}
                >
                  <Waveform size={16} weight="bold" />
                  Speaking Practice
                </Button>
              </div>
            </Card>
          </div>

          <div className="min-h-0 flex-1">
            {type === "room" ? (
              <SpeakingRoomScreenInner embedded />
            ) : (
              <SpeakingPracticeLabScreenInner embedded />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
