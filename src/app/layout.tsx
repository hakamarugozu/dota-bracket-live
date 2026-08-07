import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Esports Bracket Live",
    template: "%s | Esports Bracket Live",
  },

  description:
    "Plataforma profesional para crear, organizar y administrar torneos multijuego con eliminación simple y doble.",

  applicationName: "Esports Bracket Live",

  keywords: [
    "torneos esports",
    "fixture de torneos",
    "bracket esports",
    "eliminación simple",
    "eliminación doble",
    "Dota 1",
    "Dota 2",
    "League of Legends",
    "Mobile Legends",
    "Valorant",
  ],

  authors: [
    {
      name: "Esports Bracket Live",
    },
  ],

  creator: "Esports Bracket Live",
  publisher: "Esports Bracket Live",
  category: "Esports",

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
<body>{children}</body>
    </html>
  );
}