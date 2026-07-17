import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", siteUrl));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/repo/275bed80-a451-481c-886c-457f436c0050", siteUrl));
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    const redirectResponse = NextResponse.redirect(new URL("/repo/275bed80-a451-481c-886c-457f436c0050", siteUrl));
    return redirectResponse;
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(e.message || "auth_failed")}`, siteUrl));
  }
}
