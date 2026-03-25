"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={4}
      icons={{
        success: (
          <CheckCircleIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <WarningIcon className="size-4" />
        ),
        error: (
          <XCircleIcon className="size-4" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "#1b1e22",
          "--normal-text": "#ffffff",
          "--normal-border": "#1b1e22",
          "--border-radius": "9999px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast rounded-full border-0 bg-[#1b1e22] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.28)]",
          title: "text-sm font-semibold text-white",
          description:
            "text-xs leading-relaxed text-white/85",
          actionButton:
            "rounded-full bg-white/15 text-white hover:bg-white/20",
          cancelButton:
            "rounded-full bg-white/10 text-white hover:bg-white/15",
          closeButton:
            "border-white/20 bg-[#1b1e22] text-white/85 hover:bg-[#24282d]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
