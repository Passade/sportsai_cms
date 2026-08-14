import { NextRequest, NextResponse } from "next/server";
import {
  getYouTubeSyncContext,
  isStarterPlanCategory,
  listAllSportTierCards,
  syncStarterPlanPlaylist,
} from "@/lib/youtube-playlist-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safety rails for the daily cron.
const AUTO_MAX_CARDS_PER_RUN = 10;
const AUTO_MAX_IMPORTS_PER_CARD = 5;
const AUTO_MAX_CREATE_ATTEMPTS_PER_RUN = 20;

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = requiredEnv("CRON_SECRET");
    const authorization = request.headers.get("authorization") || "";

    if (authorization !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const context = getYouTubeSyncContext();
    const cards = await listAllSportTierCards(context);

    const autoSyncCards = cards
      .filter((card) => {
        return (
          card.active !== false &&
          isStarterPlanCategory(card.category) &&
          card.youtubeAutoSync === true &&
          Boolean(String(card.youtubePlaylistUrl || "").trim())
        );
      })
      .slice(0, AUTO_MAX_CARDS_PER_RUN);

    const results: Array<Record<string, unknown>> = [];
    let remainingCreateBudget = AUTO_MAX_CREATE_ATTEMPTS_PER_RUN;
    let createAttempts = 0;

    for (const card of autoSyncCards) {
      if (remainingCreateBudget <= 0) {
        break;
      }

      try {
        const perCardBudget = Math.min(
          AUTO_MAX_IMPORTS_PER_CARD,
          remainingCreateBudget,
        );

        const result = await syncStarterPlanPlaylist({
          context,
          card,
          playlistUrl: String(card.youtubePlaylistUrl || "").trim(),
          maxImports: perCardBudget,
        });

        // processedNewVideos is the number of createDocument attempts this card
        // was allowed to make, including safe 409 conflicts from overlap.
        createAttempts += result.processedNewVideos;
        remainingCreateBudget = Math.max(
          0,
          remainingCreateBudget - result.processedNewVideos,
        );

        results.push({
          success: true,
          ...result,
        });
      } catch (error) {
        console.error(
          `Automatic YouTube sync failed for card ${card.$id}:`,
          error,
        );

        results.push({
          success: false,
          cardId: card.$id,
          cardTitle: card.name || card.title || "Starter Plan",
          message:
            error instanceof Error
              ? error.message
              : "Automatic playlist sync failed.",
        });
      }
    }

    const imported = results.reduce((total, result) => {
      return total + Number(result.imported || 0);
    }, 0);

    const skipped = results.reduce((total, result) => {
      return total + Number(result.skipped || 0);
    }, 0);

    const remainingToImport = results.reduce((total, result) => {
      return total + Number(result.remainingToImport || 0);
    }, 0);

    const failed = results.filter(
      (result) => result.success === false,
    ).length;

    return NextResponse.json(
      {
        success: failed === 0,
        cardsEligible: autoSyncCards.length,
        cardsChecked: results.length,
        imported,
        skipped,
        remainingToImport,
        createAttempts,
        maxCreateAttempts: AUTO_MAX_CREATE_ATTEMPTS_PER_RUN,
        remainingCreateBudget,
        failed,
        results,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Automatic Starter Plan YouTube sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Automatic YouTube sync failed.",
      },
      { status: 500 },
    );
  }
}
