import { NextRequest, NextResponse } from "next/server";
import {
  getYouTubeSyncContext,
  syncStarterPlanPlaylist,
  type StarterPlanCard,
} from "@/lib/youtube-playlist-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard server-side cap. A huge playlist can no longer generate hundreds of
// Appwrite creates from one click.
const MANUAL_MAX_IMPORTS_PER_REQUEST = 10;

type SyncRequestBody = {
  cardId?: string;
  playlistUrl?: string;
  syncSecret?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;
    const expectedSecret = requiredEnv("YOUTUBE_PLAYLIST_SYNC_SECRET");

    if (!body.syncSecret || body.syncSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Invalid sync secret." },
        { status: 401 },
      );
    }

    const cardId = String(body.cardId || "").trim();
    const playlistUrl = String(body.playlistUrl || "").trim();

    if (!cardId) {
      return NextResponse.json(
        { success: false, message: "Choose a Starter Plan card." },
        { status: 400 },
      );
    }

    if (!playlistUrl) {
      return NextResponse.json(
        { success: false, message: "Paste a YouTube playlist URL." },
        { status: 400 },
      );
    }

    const context = getYouTubeSyncContext();

    const card = (await context.databases.getDocument(
      context.databaseId,
      context.cardsCollectionId,
      cardId,
    )) as unknown as StarterPlanCard;

    const result = await syncStarterPlanPlaylist({
      context,
      card,
      playlistUrl,
      maxImports: MANUAL_MAX_IMPORTS_PER_REQUEST,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Manual Starter Plan YouTube sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not sync the YouTube playlist.",
      },
      { status: 500 },
    );
  }
}
