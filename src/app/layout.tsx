import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AITRADE Terminal",
  description:
    "BIST odaklı, modern ve genişletilebilir web tabanlı trading terminali.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
