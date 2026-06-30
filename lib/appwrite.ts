import { Account, Client, Databases, ID, Query, Storage } from "appwrite";

export const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,

  streamsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_STREAMS_COLLECTION_ID!,
  fixturesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FIXTURES_COLLECTION_ID!,
  predictionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PREDICTIONS_COLLECTION_ID!,
  fixtureChatsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_FIXTURE_CHATS_COLLECTION_ID!,
  teamsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID!,
  playersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PLAYERS_COLLECTION_ID!,

  communityPostsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POSTS_COLLECTION_ID!,
  communityPostOptionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POST_OPTIONS_COLLECTION_ID!,
  communityPostVotesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POST_VOTES_COLLECTION_ID!,
  communityPostReactionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POST_REACTIONS_COLLECTION_ID!,

  cmsAuditLogsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CMS_AUDIT_LOGS_COLLECTION_ID!,

  mediaBucketId: process.env.NEXT_PUBLIC_APPWRITE_MEDIA_BUCKET_ID!,
};

export const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

type AppwriteLogEntry = {
  id: string;
  label: string;
  method: string;
  status: "ok" | "error";
  durationMs: number;
  startedAt: string;
  endedAt: string;
  errorMessage?: string;
};

type AppwriteDebugStats = {
  total: number;
  ok: number;
  error: number;
  byMethod: Record<string, number>;
  recent: AppwriteLogEntry[];
};

declare global {
  // eslint-disable-next-line no-var
  var __APPWRITE_DEBUG_STATS__: AppwriteDebugStats | undefined;
}

function getDebugEnabled() {
  return process.env.NEXT_PUBLIC_APPWRITE_DEBUG_REQUESTS === "true";
}

function getRuntimeName() {
  if (typeof window === "undefined") {
    return "server";
  }

  return "browser";
}

function getNowMs() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }

  return Date.now();
}

function getStats() {
  if (!globalThis.__APPWRITE_DEBUG_STATS__) {
    globalThis.__APPWRITE_DEBUG_STATS__ = {
      total: 0,
      ok: 0,
      error: 0,
      byMethod: {},
      recent: [],
    };
  }

  return globalThis.__APPWRITE_DEBUG_STATS__;
}

function saveLogEntry(entry: AppwriteLogEntry) {
  const stats = getStats();

  stats.total += 1;

  if (entry.status === "ok") {
    stats.ok += 1;
  } else {
    stats.error += 1;
  }

  const methodKey = `${entry.label}.${entry.method}`;
  stats.byMethod[methodKey] = (stats.byMethod[methodKey] || 0) + 1;

  stats.recent.unshift(entry);
  stats.recent = stats.recent.slice(0, 100);

  console.log("[APPWRITE:STATS]", {
    total: stats.total,
    ok: stats.ok,
    error: stats.error,
    byMethod: stats.byMethod,
  });
}
function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeArgs(args: any[]) {
  return args.map((arg) => {
    if (Array.isArray(arg)) {
      return arg;
    }

    if (typeof arg === "string") {
      if (arg.length > 80) {
        return `${arg.slice(0, 80)}...`;
      }

      return arg;
    }

    if (arg && typeof arg === "object") {
      const keys = Object.keys(arg);

      if (keys.length > 12) {
        return {
          type: "object",
          keys: keys.slice(0, 12),
          extraKeys: keys.length - 12,
        };
      }

      return arg;
    }

    return arg;
  });
}

function summarizeResult(result: any) {
  if (!result || typeof result !== "object") {
    return result;
  }

  if ("documents" in result) {
    return {
      total: result.total,
      returned: Array.isArray(result.documents) ? result.documents.length : 0,
    };
  }

  if ("files" in result) {
    return {
      total: result.total,
      returned: Array.isArray(result.files) ? result.files.length : 0,
    };
  }

  if ("$id" in result) {
    return {
      id: result.$id,
      createdAt: result.$createdAt,
      updatedAt: result.$updatedAt,
    };
  }

  return {
    type: "object",
    keys: Object.keys(result).slice(0, 12),
  };
}

function createLoggedAppwriteClient<T extends object>(target: T, label: string): T {
  if (!getDebugEnabled()) {
    return target;
  }

  return new Proxy(target, {
    get(originalTarget, property, receiver) {
      const value = Reflect.get(originalTarget, property, receiver);

      if (typeof value !== "function") {
        return value;
      }

      return async (...args: any[]) => {
        const method = String(property);
        const id = createRequestId();
        const startedAt = new Date();
        const startTime = getNowMs();

        console.log(
          `[APPWRITE:${getRuntimeName()}] #${id} START ${label}.${method}`,
          {
            args: summarizeArgs(args),
          }
        );

        try {
          const result = await value.apply(originalTarget, args);
          const endedAt = new Date();
          const durationMs = Math.round(getNowMs() - startTime);

          const entry: AppwriteLogEntry = {
            id,
            label,
            method,
            status: "ok",
            durationMs,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
          };

          saveLogEntry(entry);

          console.log(
            `[APPWRITE:${getRuntimeName()}] #${id} OK ${label}.${method} ${durationMs}ms`,
            summarizeResult(result)
          );

          return result;
        } catch (error: any) {
          const endedAt = new Date();
          const durationMs = Math.round(getNowMs() - startTime);

          const entry: AppwriteLogEntry = {
            id,
            label,
            method,
            status: "error",
            durationMs,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            errorMessage:
              error?.message ||
              error?.response?.message ||
              JSON.stringify(error) ||
              "Unknown Appwrite error",
          };

          saveLogEntry(entry);

          console.error(
            `[APPWRITE:${getRuntimeName()}] #${id} ERROR ${label}.${method} ${durationMs}ms`,
            error
          );

          throw error;
        }
      };
    },
  });
}

export function getAppwriteDebugStats() {
  return getStats();
}

export function resetAppwriteDebugStats() {
  globalThis.__APPWRITE_DEBUG_STATS__ = {
    total: 0,
    ok: 0,
    error: 0,
    byMethod: {},
    recent: [],
  };

  return globalThis.__APPWRITE_DEBUG_STATS__;
}

export const account = createLoggedAppwriteClient(new Account(client), "account");
export const databases = createLoggedAppwriteClient(
  new Databases(client),
  "databases"
);
export const storage = createLoggedAppwriteClient(new Storage(client), "storage");

export { ID, Query };
