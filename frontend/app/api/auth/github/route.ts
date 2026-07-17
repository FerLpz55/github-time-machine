import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI
    || process.env.NEXT_PUBLIC_SITE_URL + "/api/auth/github"
    || "http://localhost:3000/api/auth/github";

  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=github_not_configured", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user repo");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
