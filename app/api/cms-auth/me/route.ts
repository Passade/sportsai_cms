import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authSecret = process.env.CMS_AUTH_SECRET;

  const cookieHeader = request.headers.get("cookie") || "";

  const isAuthed = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie === `sportsai_cms_auth=${authSecret}`);

  if (!authSecret || !isAuthed) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}