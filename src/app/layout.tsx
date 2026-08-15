import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pasooriizm | Spotify Playlist Downloader by harisizm",
  description:
    "Download Spotify playlists, albums, and tracks in high quality 320kbps MP3, M4A, OPUS or WAV. No song limits, save all songs as a ZIP directly to your device.",
  keywords: [
    "pasooriizm",
    "harisizm",
    "spotify downloader",
    "playlist downloader",
    "pakistani songs downloader",
    "pasoori downloader",
    "spotify to mp3",
  ],
  openGraph: {
    title: "Pasooriizm | Spotify Playlist Downloader by harisizm",
    description:
      "Download Spotify playlists in high quality 320kbps audio. Free, no song limits.",
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
