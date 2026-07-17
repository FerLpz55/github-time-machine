import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function POST() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/login", siteUrl), {
    status: 303,
  });
}
