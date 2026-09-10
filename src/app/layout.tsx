import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "CAccessRoots | Communication. Access. Roots.",
  description:
    "A community-led pro bono platform connecting Deaf community members with volunteer interpreters for the moments that matter.",

  keywords: [
    "CAccessRoots",
    "Deaf community",
    "ASL interpreters",
    "volunteer interpreters",
    "communication access",
    "accessibility",
    "pro bono interpreting",
  ],

  openGraph: {
    title: "CAccessRoots | Communication. Access. Roots.",
    description:
      "Connecting Deaf community members with volunteer interpreters for the moments that matter.",
    siteName: "CAccessRoots",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
