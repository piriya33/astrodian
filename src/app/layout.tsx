import type { Metadata } from "next";
import { Inter, Cinzel, Prompt } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const promptFont = Prompt({
  variable: "--font-prompt",
  weight: ["300", "400", "500"],
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "PEKKY | The Crystal Glass of Destiny",
  description: "Astrology Engine & AI Personality Readings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cinzel.variable} ${promptFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
