import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpotDown | Spotify Playlist Downloader",
  description:
    "Download entire Spotify playlists in high quality MP3, M4A, OPUS or WAV. No song limit, parallel downloads, completely free.",
  keywords: [
    "spotify downloader",
    "playlist downloader",
    "mp3 downloader",
    "spotify to mp3",
    "music downloader",
  ],
  openGraph: {
    title: "SpotDown | Spotify Playlist Downloader",
    description:
      "Download entire Spotify playlists in high quality. No song limit, parallel downloads, free.",
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
