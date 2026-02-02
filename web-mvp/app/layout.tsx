import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeEnglish - Learn English through Video",
  description: "Comprehensible input-based English learning tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
