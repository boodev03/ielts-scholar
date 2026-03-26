import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import AppProviders from "./providers";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IELTS Scholar",
  description: "High-end editorial academic learning",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", inter.variable, plusJakarta.variable, "font-mono", jetbrainsMono.variable)}>
      <body className="h-full">
        <AppProviders>
          <TooltipProvider>
            {children}
            <Toaster
              theme="light"
              richColors
              position="top-center"
              closeButton
              visibleToasts={4}
            />
          </TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
