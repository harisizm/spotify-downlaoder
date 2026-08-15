/**
 * Spotify PKCE OAuth Flow
 *
 * Implements the Authorization Code with PKCE flow so we never expose
 * the client secret in the browser. The token exchange goes through
 * our own API route (/api/spotify/token) which holds the secret.
 */

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://localhost:3000/callback";

const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-read-private",
  "user-read-email",
].join(" ");

/* ========== PKCE Helpers ========== */

/**
 * Generate a cryptographically random string for the code verifier
 */
function generateRandomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join("");
}

/**
 * Create a SHA-256 hash of the code verifier, then base64url-encode it
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ========== Token Storage ========== */

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
}

export function saveTokens(tokens: SpotifyTokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("spotify_tokens", JSON.stringify(tokens));
}

export function getTokens(): SpotifyTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("spotify_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("spotify_tokens");
  localStorage.removeItem("spotify_code_verifier");
}

export function isTokenValid(): boolean {
  const tokens = getTokens();
  if (!tokens) return false;
  // Consider expired if less than 60 seconds remaining
  return Date.now() < tokens.expiresAt - 60_000;
}

/* ========== Auth Flow ========== */

/**
 * Step 1: Redirect the user to Spotify's auth page
 */
export async function initiateSpotifyAuth(): Promise<void> {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store the verifier so we can use it in the callback
  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    show_dialog: "false",
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Step 2: Exchange the authorization code for tokens
 * This calls our own Next.js API route which holds the client secret.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<SpotifyTokens> {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  if (!codeVerifier) {
    throw new Error("No code verifier found. Please restart the auth flow.");
  }

  const response = await fetch("/api/spotify/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to exchange authorization code");
  }

  const data = await response.json();

  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveTokens(tokens);
  localStorage.removeItem("spotify_code_verifier");

  return tokens;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<SpotifyTokens> {
  const tokens = getTokens();
  if (!tokens?.refreshToken) {
    throw new Error("No refresh token available. Please log in again.");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Failed to refresh token. Please log in again.");
  }

  const data = await response.json();

  const newTokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveTokens(newTokens);
  return newTokens;
}

/**
 * Get a valid access token, refreshing if needed
 */
export async function getValidAccessToken(): Promise<string> {
  let tokens = getTokens();
  if (!tokens) {
    throw new Error("Not authenticated. Please log in.");
  }

  if (!isTokenValid()) {
    tokens = await refreshAccessToken();
  }

  return tokens.accessToken;
}

/**
 * Get the user's Spotify profile
 */
export async function getSpotifyProfile(): Promise<SpotifyUserProfile> {
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

/* ========== Types ========== */

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: { url: string; width: number; height: number }[];
  product: string;
  country: string;
}
