import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Simulator",
  description: "Interactive 2026 World Cup match simulator with Gemini tactical injury advisor."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
