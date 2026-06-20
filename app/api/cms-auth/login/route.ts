import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const username = String(body.username || "");
  const password = String(body.password || "");

  const validUsername = process.env.CMS_USERNAME;
  const validPassword = process.env.CMS_PASSWORD;
  const authSecret = process.env.CMS_AUTH_SECRET;

  if (!validUsername || !validPassword || !authSecret) {
    return NextResponse.json(
      { message: "CMS auth environment variables are missing." },
      { status: 500 }
    );
  }

  if (username !== validUsername || password !== validPassword) {
    return NextResponse.json(
      { message: "Invalid username or password." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("sportsai_cms_auth", authSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}