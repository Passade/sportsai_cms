import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YouTubeThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type YouTubePlaylistItem = {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: {
      maxres?: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      high?: YouTubeThumbnail;
      medium?: YouTubeThumbnail;
      default?: YouTubeThumbnail;
    };
  };
  contentDetails?: { videoId?: string };
  status?: { privacyStatus?: string };
};

type YouTubePlaylistResponse = {
  nextPageToken?: string;
  items?: YouTubePlaylistItem[];
  error?: { message?: string };
};

type SyncRequestBody = {
  cardId?: string;
  playlistUrl?: string;
  syncSecret?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function extractPlaylistId(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  try {
    const parsed = new URL(clean);
    return parsed.searchParams.get("list") || "";
  } catch {
    return /^[A-Za-z0-9_-]+$/.test(clean) ? clean : "";
  }
}

function extractYouTubeVideoId(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com")
    ) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
        return parts[1] || "";
      }
    }
  } catch {
    // Fall through to plain-ID validation.
  }

  return /^[A-Za-z0-9_-]{6,}$/.test(clean) ? clean : "";
}

function normalizeCategory(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStarterPlan(value?: string) {
  const category = normalizeCategory(value);
  return (
    category === "starter" ||
    category === "starter plan" ||
    category === "starter sport" ||
    category === "starter sports"
  );
}

function normalizeSportForStreams(value?: string) {
  const rawSport = String(value || "Sports").trim();
  const normalized = rawSport.toLowerCase();

  if (
    normalized === "f1" ||
    normalized === "formula 1" ||
    normalized === "formula one"
  ) {
    return "Motorsport";
  }

  return rawSport;
}

function selectThumbnail(item: YouTubePlaylistItem) {
  const thumbnails = item.snippet?.thumbnails;
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ""
  );
}

function buildSearchText(values: Array<string | undefined>) {
  return values.filter(Boolean).map(String).join(" ").toLowerCase();
}

function getStableYouTubeDocumentId(cardId: string, videoId: string) {
  const hash = createHash("sha256")
    .update(`${cardId}:${videoId}`)
    .digest("hex")
    .slice(0, 28);

  return `yt_${hash}`;
}

async function fetchPlaylistItems(params: { playlistId: string; apiKey: string }) {
  const allItems: YouTubePlaylistItem[] = [];
  let pageToken = "";

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("playlistId", params.playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", params.apiKey);

    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as YouTubePlaylistResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message || "YouTube playlist request failed.");
    }

    allItems.push(...(payload.items || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return allItems;
}

async function getAllExistingYouTubeVideoIds(params: {
  databases: Databases;
  databaseId: string;
  streamsCollectionId: string;
  matchKeyword: string;
}) {
  const videoIds = new Set<string>();
  const limit = 100;
  let offset = 0;

  while (true) {
    const result = await params.databases.listDocuments(
      params.databaseId,
      params.streamsCollectionId,
      [
        Query.equal("competition", params.matchKeyword),
        Query.equal("status", "vod"),
        Query.equal("vodType", "youtube"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    for (const document of result.documents) {
      const videoId = extractYouTubeVideoId(String(document.vodUrl || ""));
      if (videoId) videoIds.add(videoId);
    }

    offset += result.documents.length;

    if (
      result.documents.length === 0 ||
      result.documents.length < limit ||
      offset >= result.total
    ) {
      break;
    }
  }

  return videoIds;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;
    const expectedSecret = requiredEnv("YOUTUBE_PLAYLIST_SYNC_SECRET");

    if (!body.syncSecret || body.syncSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Invalid sync secret." },
        { status: 401 }
      );
    }

    const cardId = String(body.cardId || "").trim();
    const playlistId = extractPlaylistId(String(body.playlistUrl || ""));

    if (!cardId) {
      return NextResponse.json(
        { success: false, message: "Choose a Starter Plan card." },
        { status: 400 }
      );
    }

    if (!playlistId) {
      return NextResponse.json(
        { success: false, message: "Enter a valid YouTube playlist URL." },
        { status: 400 }
      );
    }

    const endpoint = requiredEnv("APPWRITE_ENDPOINT");
    const projectId = requiredEnv("APPWRITE_PROJECT_ID");
    const apiKey = requiredEnv("APPWRITE_API_KEY");
    const databaseId = requiredEnv("APPWRITE_DATABASE_ID");
    const streamsCollectionId = requiredEnv("APPWRITE_STREAMS_COLLECTION_ID");
    const cardsCollectionId = requiredEnv("APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID");
    const youtubeApiKey = requiredEnv("YOUTUBE_API_KEY");

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const card = await databases.getDocument(
      databaseId,
      cardsCollectionId,
      cardId
    );

    if (!isStarterPlan(String(card.category || ""))) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected card is not in the Starter Plan category.",
        },
        { status: 400 }
      );
    }

    const cardTitle = String(card.name || card.title || "Starter Plan").trim();
    const matchKeyword = String(card.matchKeyword || cardTitle).trim();

    if (!matchKeyword) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected card needs a matchKeyword or title.",
        },
        { status: 400 }
      );
    }

    const sport = normalizeSportForStreams(String(card.sport || "Sports"));

    // YouTube API requests only; these are not Appwrite requests.
    const playlistItems = await fetchPlaylistItems({
      playlistId,
      apiKey: youtubeApiKey,
    });

    // Reads ALL existing YouTube VODs for this card in pages of 100.
    const existingVideoIds = await getAllExistingYouTubeVideoIds({
      databases,
      databaseId,
      streamsCollectionId,
      matchKeyword,
    });

    let imported = 0;
    let skipped = 0;
    let unavailable = 0;

    for (const item of playlistItems) {
      const videoId =
        item.contentDetails?.videoId ||
        item.snippet?.resourceId?.videoId ||
        "";

      const title = String(item.snippet?.title || "").trim();
      const privacyStatus = String(item.status?.privacyStatus || "").toLowerCase();

      if (
        !videoId ||
        !title ||
        title === "Deleted video" ||
        title === "Private video" ||
        privacyStatus === "private"
      ) {
        unavailable += 1;
        continue;
      }

      if (existingVideoIds.has(videoId)) {
        skipped += 1;
        continue;
      }

      const vodUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnail = selectThumbnail(item);
      const description = String(item.snippet?.description || "").trim();
      const publishedAt = item.snippet?.publishedAt || new Date().toISOString();

      const documentData = {
        title,
        status: "vod",
        competition: matchKeyword,
        sport,
        thumbnail,
        vodUrl,
        vodType: "youtube",
        description,
        matchDate: publishedAt,
        isFeatured: false,
        searchText: buildSearchText([
          title,
          description,
          matchKeyword,
          sport,
          cardTitle,
          "youtube",
          "starter plan",
        ]),
      };

      const documentId = getStableYouTubeDocumentId(cardId, videoId);

      try {
        await databases.createDocument(
          databaseId,
          streamsCollectionId,
          documentId,
          documentData
        );

        existingVideoIds.add(videoId);
        imported += 1;
      } catch (error: any) {
        if (error?.code === 409) {
          existingVideoIds.add(videoId);
          skipped += 1;
          continue;
        }

        console.error(`Failed to import YouTube video ${videoId}:`, error);
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      cardId,
      cardTitle,
      matchKeyword,
      playlistId,
      totalPlaylistItems: playlistItems.length,
      imported,
      skipped,
      unavailable,
      message:
        imported > 0
          ? `${imported} new video${imported === 1 ? "" : "s"} imported.`
          : "No new videos were found.",
    });
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
      { status: 500 }
    );
  }
}