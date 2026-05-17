import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "ASAP MONITOR",
  description: "Pemantauan lingkungan & kontrol sprayer · real-time",
};

import { SocketProvider } from "../hooks/useSocket";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${ibmPlexMono.variable} ${plusJakartaSans.variable}`}>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
