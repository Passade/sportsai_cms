import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  Databases,
  ID,
  Query,
} from "node-appwrite";

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
    position?: number;
    resourceId?: {
      videoId?: string;
    };
    thumbnails?: {
      maxres?: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      high?: YouTubeThumbnail;
      medium?: YouTubeThumbnail;
      default?: YouTubeThumbnail;
    };
  };
  contentDetails?: {
    videoId?: string;
  };
  status?: {
    privacyStatus?: string;
  };
};

type YouTubePlaylistResponse = {
  nextPageToken?: string;
  items?: YouTubePlaylistItem[];
};

type YouTubeErrorResponse = {
  error?: {
    message?: string;
  };
};

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

function extractPlaylistId(value: string) {
  const clean = String(value || "").trim();

  if (!clean) {
    return "";
  }

  try {
    const parsed = new URL(clean);
    return parsed.searchParams.get("list") || "";
  } catch {
    return /^[A-Za-z0-9_-]+$/.test(clean)
      ? clean
      : "";
  }
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

function selectThumbnail(
  item: YouTubePlaylistItem
) {
  const thumbnails =
    item.snippet?.thumbnails;

  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ""
  );
}

function buildSearchText(
  values: Array<string | undefined>
) {
  return values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPlaylistItems(params: {
  playlistId: string;
  apiKey: string;
}) {
  const allItems: YouTubePlaylistItem[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );

    url.searchParams.set(
      "part",
      "snippet,contentDetails,status"
    );

    url.searchParams.set(
      "playlistId",
      params.playlistId
    );

    url.searchParams.set(
      "maxResults",
      "50"
    );

    url.searchParams.set(
      "key",
      params.apiKey
    );

    if (pageToken) {
      url.searchParams.set(
        "pageToken",
        pageToken
      );
    }

    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const payload =
      (await response.json()) as
        | YouTubePlaylistResponse
        | YouTubeErrorResponse;

    if (!response.ok) {
      const message =
        "error" in payload
          ? payload.error?.message
          : "YouTube playlist request failed.";

      throw new Error(
        message ||
          "YouTube playlist request failed."
      );
    }

    const page =
      payload as YouTubePlaylistResponse;

    allItems.push(
      ...(page.items || [])
    );

    pageToken =
      page.nextPageToken || "";
  } while (pageToken);

  return allItems;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as SyncRequestBody;

    const expectedSecret = requiredEnv(
      "YOUTUBE_PLAYLIST_SYNC_SECRET"
    );

    if (
      !body.syncSecret ||
      body.syncSecret !== expectedSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid sync secret.",
        },
        {
          status: 401,
        }
      );
    }

    const cardId = String(
      body.cardId || ""
    ).trim();

    const playlistId =
      extractPlaylistId(
        String(body.playlistUrl || "")
      );

    if (!cardId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Choose a Starter Plan card.",
        },
        {
          status: 400,
        }
      );
    }

    if (!playlistId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid YouTube playlist URL.",
        },
        {
          status: 400,
        }
      );
    }

    const endpoint = requiredEnv(
      "APPWRITE_ENDPOINT"
    );

    const projectId = requiredEnv(
      "APPWRITE_PROJECT_ID"
    );

    const apiKey = requiredEnv(
      "APPWRITE_API_KEY"
    );

    const databaseId = requiredEnv(
      "APPWRITE_DATABASE_ID"
    );

    const streamsCollectionId =
      requiredEnv(
        "APPWRITE_STREAMS_COLLECTION_ID"
      );

    const cardsCollectionId =
      requiredEnv(
        "APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID"
      );

    const youtubeApiKey = requiredEnv(
      "YOUTUBE_API_KEY"
    );

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases =
      new Databases(client);

    const card =
      await databases.getDocument(
        databaseId,
        cardsCollectionId,
        cardId
      );

    const category =
      normalizeCategory(
        String(card.category || "")
      );

    if (
      category !== "starter" &&
      category !== "starter plan" &&
      category !== "starter sport" &&
      category !== "starter sports"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected card is not in the Starter Plan category.",
        },
        {
          status: 400,
        }
      );
    }

    const cardTitle = String(
      card.name ||
        card.title ||
        "Starter Plan"
    ).trim();

    const matchKeyword = String(
      card.matchKeyword ||
        cardTitle
    ).trim();

    const sport = String(
      card.sport || "Sports"
    ).trim();

    if (!matchKeyword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected card needs a matchKeyword or title.",
        },
        {
          status: 400,
        }
      );
    }

    const playlistItems =
      await fetchPlaylistItems({
        playlistId,
        apiKey: youtubeApiKey,
      });

    const existingResult =
      await databases.listDocuments(
        databaseId,
        streamsCollectionId,
        [
          Query.equal(
            "competition",
            matchKeyword
          ),
          Query.equal(
            "status",
            "vod"
          ),
          Query.equal(
            "vodType",
            "youtube"
          ),
          Query.limit(100),
        ]
      );

    const existingUrls = new Set(
      existingResult.documents
        .map((document) =>
          String(
            document.vodUrl || ""
          ).trim()
        )
        .filter(Boolean)
    );

    let imported = 0;
    let skipped = 0;
    let unavailable = 0;
    let failed = 0;

    for (const item of playlistItems) {
      const videoId =
        item.contentDetails?.videoId ||
        item.snippet?.resourceId
          ?.videoId ||
        "";

      const title = String(
        item.snippet?.title || ""
      ).trim();

      const privacyStatus = String(
        item.status?.privacyStatus || ""
      )
        .toLowerCase()
        .trim();

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

      const vodUrl =
        `https://www.youtube.com/watch?v=${videoId}`;

      if (existingUrls.has(vodUrl)) {
        skipped += 1;
        continue;
      }

      const thumbnail =
        selectThumbnail(item);

      const description = String(
        item.snippet?.description || ""
      ).trim();

      const publishedAt =
        item.snippet?.publishedAt ||
        new Date().toISOString();

      const documentData = {
        title,
        status: "vod",
        competition: matchKeyword,
        sport,

        homeTeam: cardTitle,
        awayTeam: "YouTube",
        venue: "YouTube",
        city: "",
        country: "",

        streamUrl: vodUrl,
        vodUrl,
        vodType: "youtube",

        thumbnail,
        description,
        matchDate: publishedAt,
        isFeatured: false,

        searchText:
          buildSearchText([
            title,
            description,
            matchKeyword,
            sport,
            cardTitle,
            "YouTube",
            "Starter Plan",
          ]),
      };

      try {
        await databases.createDocument(
          databaseId,
          streamsCollectionId,
          ID.unique(),
          documentData
        );

        existingUrls.add(vodUrl);
        imported += 1;

        console.log(
          `Imported YouTube video ${videoId}`
        );
      } catch (createError) {
        failed += 1;

        console.error(
          `Failed to import YouTube video ${videoId}:`,
          createError
        );
      }
    }

    let message = "No new videos were found.";

    if (failed > 0) {
      message =
        `${failed} video${
          failed === 1 ? "" : "s"
        } failed to import. Check the server logs.`;
    } else if (imported > 0) {
      message =
        `${imported} new video${
          imported === 1 ? "" : "s"
        } imported.`;
    } else if (skipped > 0) {
      message =
        `No new videos were found. ${skipped} existing video${
          skipped === 1 ? "" : "s"
        } skipped.`;
    }

    return NextResponse.json({
      success: failed === 0,
      cardId,
      cardTitle,
      matchKeyword,
      playlistId,
      totalPlaylistItems:
        playlistItems.length,
      imported,
      skipped,
      unavailable,
      failed,
      message,
    });
  } catch (error) {
    console.error(
      "Starter Plan YouTube sync error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not sync the YouTube playlist.",
      },
      {
        status: 500,
      }
    );
  }
}