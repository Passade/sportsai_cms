import { getCmsEvents } from "@/lib/cms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  console.log("[CMS:EVENTS] GET START");

  try {
    const events = await getCmsEvents();

    console.log("[CMS:EVENTS] GET OK", {
      returned: events.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      events,
    });
  } catch (error: any) {
    console.error("[CMS:EVENTS] GET ERROR", error);

    return NextResponse.json(
      {
        message:
          error?.message ||
          error?.response?.message ||
          "Could not load events.",
      },
      {
        status: 500,
      }
    );
  }
}