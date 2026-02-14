import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PollStream - Real-Time Polling",
  description: "Create and share polls with real-time results",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
