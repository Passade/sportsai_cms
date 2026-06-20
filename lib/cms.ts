import { config, databases, ID, Query } from "./appwrite";

export type EventStatus =
  | "upcoming"
  | "live"
  | "waiting"
  | "completed"
  | "cancelled"
  | "vod"
  | "hidden";

export type VodType = "video" | "youtube";

export type CmsTeam = {
  $id: string;
  name?: string;
  shortName?: string;
  logoUrl?: string;
};

export type CreateEventInput = {
  title: string;
  status: EventStatus;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  venue: string;
  thumbnail: string;
  streamUrl: string;
  vodUrl: string;
  description: string;
  competition: string;
  isFeatured: boolean;
  sport: string;
  vodType: VodType;
  fixturesId: string;
};

export function buildSearchText(data: Record<string, any>) {
  return [
    data.title,
    data.status,
    data.homeTeam,
    data.awayTeam,
    data.venue,
    data.description,
    data.competition,
    data.sport,
    data.vodType,
    data.matchDate,
  ]
    .filter(Boolean)
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

export async function getCmsTeams() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.teamsCollectionId,
    [Query.limit(500)]
  );

  return result.documents
    .map((team: any) => ({
      $id: team.$id,
      name: team.name || "",
      shortName: team.shortName || "",
      logoUrl: team.logoUrl || "",
    }))
    .filter((team) => team.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCmsEvents() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.streamsCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(100)]
  );

  return result.documents;
}

export async function getCmsEventById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.streamsCollectionId,
    id
  );
}

export async function createCmsEvent(input: CreateEventInput) {
  const title =
    input.title.trim() ||
    `${input.homeTeam.trim() || "Home"} vs ${input.awayTeam.trim() || "Away"}`;

  const matchDate = input.matchDate
    ? new Date(input.matchDate).toISOString()
    : new Date().toISOString();

  const data = {
    title,
    status: input.status,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    matchDate,
    venue: input.venue,
    thumbnail: input.thumbnail,
    streamUrl: input.streamUrl,
    vodUrl: input.vodUrl,
    description: input.description,
    competition: input.competition,
    isFeatured: input.isFeatured,
    sport: input.sport,
    vodType: input.vodType,
    fixturesId: input.fixturesId,
  };

  return databases.createDocument(
    config.databaseId,
    config.streamsCollectionId,
    ID.unique(),
    {
      ...data,
      searchText: buildSearchText(data),
    }
  );
}

export async function updateCmsEvent(id: string, input: CreateEventInput) {
  const title =
    input.title.trim() ||
    `${input.homeTeam.trim() || "Home"} vs ${input.awayTeam.trim() || "Away"}`;

  const matchDate = input.matchDate
    ? new Date(input.matchDate).toISOString()
    : new Date().toISOString();

  const data = {
    title,
    status: input.status,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    matchDate,
    venue: input.venue,
    thumbnail: input.thumbnail,
    streamUrl: input.streamUrl,
    vodUrl: input.vodUrl,
    description: input.description,
    competition: input.competition,
    isFeatured: input.isFeatured,
    sport: input.sport,
    vodType: input.vodType,
    fixturesId: input.fixturesId,
  };

  return databases.updateDocument(
    config.databaseId,
    config.streamsCollectionId,
    id,
    {
      ...data,
      searchText: buildSearchText(data),
    }
  );
}

export async function deleteCmsEvent(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.streamsCollectionId,
    id
  );
}

export async function deleteCmsFixture(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id
  );
}

async function safeDeleteFixture(id: string) {
  try {
    await deleteCmsFixture(id);
  } catch (error: any) {
    if (error?.code === 404) {
      return;
    }

    throw error;
  }
}

async function safeDeleteEvent(id: string) {
  try {
    await deleteCmsEvent(id);
  } catch (error: any) {
    if (error?.code === 404) {
      return;
    }

    throw error;
  }
}

export async function deleteCmsEventAndFixture(
  eventId: string,
  fixturesId?: string
) {
  const fixtureIdsToDelete = new Set<string>();

  if (fixturesId && fixturesId.trim()) {
    fixtureIdsToDelete.add(fixturesId.trim());
  }

  const linkedFixtures = await databases.listDocuments(
    config.databaseId,
    config.fixturesCollectionId,
    [Query.equal("streamId", eventId), Query.limit(100)]
  );

  linkedFixtures.documents.forEach((fixture: any) => {
    if (fixture.$id) {
      fixtureIdsToDelete.add(fixture.$id);
    }
  });

  for (const fixtureId of fixtureIdsToDelete) {
    await safeDeleteFixture(fixtureId);
  }

  await safeDeleteEvent(eventId);

  return {
    deletedEventId: eventId,
    deletedFixtureIds: Array.from(fixtureIdsToDelete),
  };
}
