import {
  getAppwriteDebugStats,
  resetAppwriteDebugStats,
} from "@/lib/appwrite";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    enabled: process.env.NEXT_PUBLIC_APPWRITE_DEBUG_REQUESTS === "true",
    stats: getAppwriteDebugStats(),
  });
}

export async function DELETE(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (process.env.CMS_DEBUG_SECRET && secret !== process.env.CMS_DEBUG_SECRET) {
    return NextResponse.json(
      {
        message: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  return NextResponse.json({
    message: "Appwrite request stats reset.",
    stats: resetAppwriteDebugStats(),
  });
}