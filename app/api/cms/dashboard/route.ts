import { getCmsDashboardAnalytics } from "@/lib/cms";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;

type DashboardAnalytics = Awaited<ReturnType<typeof getCmsDashboardAnalytics>>;

type CacheValue = {
  data: DashboardAnalytics;
  expiresAt: number;
  createdAt: number;
};

let dashboardCache: CacheValue | null = null;
let pendingRequest: Promise<DashboardAnalytics> | null = null;

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNowMs() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }

  return Date.now();
}

async function getCachedDashboardAnalytics(forceFresh: boolean, requestId: string) {
  const now = Date.now();

  if (!forceFresh && dashboardCache && dashboardCache.expiresAt > now) {
    console.log(`[CMS:DASHBOARD] #${requestId} CACHE HIT`);

    return {
      data: dashboardCache.data,
      cache: "HIT",
    };
  }

  if (!forceFresh && pendingRequest) {
    console.log(`[CMS:DASHBOARD] #${requestId} CACHE WAIT`);

    const data = await pendingRequest;

    return {
      data,
      cache: "WAIT",
    };
  }

  console.log(`[CMS:DASHBOARD] #${requestId} CACHE MISS - fetching Appwrite`);

  pendingRequest = getCmsDashboardAnalytics();

  try {
    const data = await pendingRequest;

    dashboardCache = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return {
      data,
      cache: "MISS",
    };
  } finally {
    pendingRequest = null;
  }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const start = getNowMs();

  try {
    const forceFresh = request.nextUrl.searchParams.get("fresh") === "1";

    console.log(`[CMS:DASHBOARD] #${requestId} START`, {
      forceFresh,
      url: request.nextUrl.pathname + request.nextUrl.search,
    });

    const { data, cache } = await getCachedDashboardAnalytics(
      forceFresh,
      requestId
    );

    const durationMs = Math.round(getNowMs() - start);

    console.log(`[CMS:DASHBOARD] #${requestId} OK ${durationMs}ms`, {
      cache,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=300",
        "X-CMS-Cache": cache,
        "X-CMS-Request-Id": requestId,
        "X-CMS-Duration-Ms": String(durationMs),
      },
    });
  } catch (error: any) {
    const durationMs = Math.round(getNowMs() - start);

    console.error(`[CMS:DASHBOARD] #${requestId} ERROR ${durationMs}ms`, error);

    return NextResponse.json(
      {
        message:
          error?.message ||
          error?.response?.message ||
          "Could not load dashboard analytics.",
      },
      {
        status: 500,
        headers: {
          "X-CMS-Request-Id": requestId,
          "X-CMS-Duration-Ms": String(durationMs),
        },
      }
    );
  }
}
