import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENTS_PER_BATCH = 50;
const MAX_PAYLOAD_LENGTH = 30000;

type SponsorEventKind =
  | "impression"
  | "click"
  | "qualified_view"
  | "view_session";

type SponsorPlacement = "home_banner" | "live" | "vod";

type SponsorEvent = {
  id?: string;
  kind?: SponsorEventKind;
  placement?: SponsorPlacement;
  bannerId?: string;
  contentId?: string;
  sponsorName?: string;
  campaignId?: string;
  campaignName?: string;
  federation?: string;
  division?: string;
  sport?: string;
  matchTitle?: string;
  viewSeconds?: number;
  sessionId?: string;
  occurredAt?: string;
};

type SponsorBatchBody = {
  batchId?: string;
  day?: string;
  source?: string;
  events?: SponsorEvent[];
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function validDocumentId(value: string) {
  return /^[a-zA-Z0-9._-]{1,36}$/.test(value);
}

function validDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cleanEvent(event: SponsorEvent): SponsorEvent | null {
  const id = cleanText(event.id, 80);
  const allowedKinds: SponsorEventKind[] = [
    "impression",
    "click",
    "qualified_view",
    "view_session",
  ];
  const allowedPlacements: SponsorPlacement[] = ["home_banner", "live", "vod"];

  const kind = allowedKinds.includes(event.kind as SponsorEventKind)
    ? (event.kind as SponsorEventKind)
    : null;

  const placement = allowedPlacements.includes(event.placement as SponsorPlacement)
    ? (event.placement as SponsorPlacement)
    : event.bannerId
      ? "home_banner"
      : null;

  const bannerId = cleanText(event.bannerId, 80);
  const contentId = cleanText(event.contentId, 80);
  const sessionId = cleanText(event.sessionId, 100);
  const occurredAt = cleanText(event.occurredAt, 40);

  if (!id || !kind || !placement || !sessionId || !occurredAt) {
    return null;
  }

  if (placement === "home_banner" && !bannerId) {
    return null;
  }

  if ((placement === "live" || placement === "vod") && !contentId) {
    return null;
  }

  const occurredDate = new Date(occurredAt);

  if (Number.isNaN(occurredDate.getTime())) {
    return null;
  }

  const rawViewSeconds = Number(event.viewSeconds || 0);
  const viewSeconds = Number.isFinite(rawViewSeconds)
    ? Math.max(0, Math.min(24 * 60 * 60, Math.round(rawViewSeconds)))
    : 0;

  return {
    id,
    kind,
    placement,
    bannerId,
    contentId,
    sponsorName: cleanText(event.sponsorName, 120),
    campaignId: cleanText(event.campaignId, 100),
    campaignName: cleanText(event.campaignName, 160),
    federation: cleanText(event.federation, 140),
    division: cleanText(event.division, 140),
    sport: cleanText(event.sport, 100),
    matchTitle: cleanText(event.matchTitle, 180),
    viewSeconds,
    sessionId,
    occurredAt: occurredDate.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SponsorBatchBody;

    const batchId = cleanText(body.batchId, 36);
    const day = cleanText(body.day, 10);
    const source = cleanText(body.source || "mobile-sponsor-analytics", 50);

    if (!validDocumentId(batchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid analytics batch ID." },
        { status: 400 }
      );
    }

    if (!validDay(day)) {
      return NextResponse.json(
        { success: false, message: "Invalid analytics day." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { success: false, message: "No analytics events supplied." },
        { status: 400 }
      );
    }

    if (body.events.length > MAX_EVENTS_PER_BATCH) {
      return NextResponse.json(
        { success: false, message: "Analytics batch is too large." },
        { status: 413 }
      );
    }

    const events = body.events
      .map(cleanEvent)
      .filter(Boolean) as SponsorEvent[];

    if (events.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid analytics events supplied." },
        { status: 400 }
      );
    }

    const eventsAllMatchDay = events.every(
      (event) => String(event.occurredAt || "").slice(0, 10) === day
    );

    if (!eventsAllMatchDay) {
      return NextResponse.json(
        { success: false, message: "All events in a batch must share the same day." },
        { status: 400 }
      );
    }

    const payload = JSON.stringify(events);

    if (payload.length > MAX_PAYLOAD_LENGTH) {
      return NextResponse.json(
        { success: false, message: "Analytics payload is too large." },
        { status: 413 }
      );
    }

    const endpoint = requiredEnv("APPWRITE_ENDPOINT");
    const projectId = requiredEnv("APPWRITE_PROJECT_ID");
    const apiKey = requiredEnv("APPWRITE_API_KEY");
    const databaseId = requiredEnv("APPWRITE_DATABASE_ID");
    const analyticsCollectionId = requiredEnv(
      "APPWRITE_SPONSOR_ANALYTICS_COLLECTION_ID"
    );

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    try {
      await databases.createDocument(
        databaseId,
        analyticsCollectionId,
        batchId,
        {
          day,
          eventCount: events.length,
          source,
          payload,
        }
      );
    } catch (error: any) {
      if (error?.code === 409) {
        return NextResponse.json({
          success: true,
          duplicateBatch: true,
          accepted: events.length,
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      duplicateBatch: false,
      accepted: events.length,
    });
  } catch (error) {
    console.error("Sponsor analytics batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not save sponsor analytics.",
      },
      { status: 500 }
    );
  }
}
