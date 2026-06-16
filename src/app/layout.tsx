import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { DemoProvider } from "@/lib/demo/provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentFlow AI | Operational Intelligence",
  description: "Infrastructure-grade AI-native operational systems by Gen I Labs.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#050505] text-[#FAFAFA] font-sans selection:bg-[#00E599]/30 selection:text-white">
        <DemoProvider>
          {children}
        </DemoProvider>
      </body>
    </html>
  );
}
