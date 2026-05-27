import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAURUM Agent Console",
  description: "Workflow control center for BAURUM agent chains"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

