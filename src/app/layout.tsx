import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pasooriizm | Spotify Playlist Vault & Downloader by harisizm",
  description:
    "Fetch & save entire Spotify playlists in studio quality 320kbps MP3, M4A, OPUS or WAV. No song limit, parallel pipeline, engineered with passion by harisizm.",
  keywords: [
    "pasooriizm",
    "harisizm",
    "spotify downloader",
    "playlist downloader",
    "pakistani songs downloader",
    "pasoori downloader",
    "spotify to mp3",
    "lossless audio",
  ],
  openGraph: {
    title: "Pasooriizm | Spotify Playlist Vault by harisizm",
    description:
      "Fetch & save entire Spotify playlists in studio-grade 320kbps audio. Free, no song caps.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
