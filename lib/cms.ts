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

export type CreateTeamInput = {
  name: string;
  shortName: string;
  logoUrl: string;
};

export type CmsPlayer = {
  $id: string;
  name?: string;
  school?: string;
  teamName?: string;
  sport?: string;
  position?: string;
  number?: number;
  dateOfBirth?: string;
  age?: number;
  country?: string;
  imageUrl?: string;
  active?: boolean;
  searchText?: string;
};

export type CreatePlayerInput = {
  name: string;
  school: string;
  teamName: string;
  sport: string;
  position: string;
  number: string;
  dateOfBirth: string;
  age: string;
  country: string;
  imageUrl: string;
  active: boolean;
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
    data.name,
    data.school,
    data.teamName,
    data.position,
    data.number,
    data.age,
    data.country,
  ]
    .filter(Boolean)
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

function toInteger(value: string) {
  const parsed = Number.parseInt(String(value || "0"), 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function toDateInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function buildPlayerData(input: CreatePlayerInput) {
  const data: Record<string, any> = {
    name: input.name.trim(),
    school: input.school.trim(),
    teamName: input.teamName.trim(),
    sport: input.sport.trim(),
    position: input.position.trim(),
    number: toInteger(input.number),
    age: toInteger(input.age),
    country: input.country.trim(),
    imageUrl: input.imageUrl.trim(),
    active: input.active,
  };

  if (input.dateOfBirth) {
    data.dateOfBirth = new Date(input.dateOfBirth).toISOString();
  }

  data.searchText = buildSearchText(data);

  return data;
}

export function normalizeDateForInput(value?: string) {
  return toDateInputValue(value);
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

export async function getCmsTeamById(id: string) {
  return databases.getDocument(config.databaseId, config.teamsCollectionId, id);
}

export async function createCmsTeam(input: CreateTeamInput) {
  const data = {
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    logoUrl: input.logoUrl.trim(),
  };

  return databases.createDocument(
    config.databaseId,
    config.teamsCollectionId,
    ID.unique(),
    data
  );
}

export async function updateCmsTeam(id: string, input: CreateTeamInput) {
  const data = {
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    logoUrl: input.logoUrl.trim(),
  };

  return databases.updateDocument(
    config.databaseId,
    config.teamsCollectionId,
    id,
    data
  );
}

export async function deleteCmsTeam(id: string) {
  return databases.deleteDocument(config.databaseId, config.teamsCollectionId, id);
}

export async function getCmsPlayers() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.playersCollectionId,
    [Query.limit(500)]
  );

  return result.documents
    .map((player: any) => ({
      $id: player.$id,
      name: player.name || "",
      school: player.school || "",
      teamName: player.teamName || "",
      sport: player.sport || "",
      position: player.position || "",
      number: typeof player.number === "number" ? player.number : 0,
      dateOfBirth: player.dateOfBirth || "",
      age: typeof player.age === "number" ? player.age : 0,
      country: player.country || "",
      imageUrl: player.imageUrl || "",
      active: Boolean(player.active),
      searchText: player.searchText || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCmsPlayerById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.playersCollectionId,
    id
  );
}

export async function createCmsPlayer(input: CreatePlayerInput) {
  return databases.createDocument(
    config.databaseId,
    config.playersCollectionId,
    ID.unique(),
    buildPlayerData(input)
  );
}

export async function updateCmsPlayer(id: string, input: CreatePlayerInput) {
  return databases.updateDocument(
    config.databaseId,
    config.playersCollectionId,
    id,
    buildPlayerData(input)
  );
}

export async function deleteCmsPlayer(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.playersCollectionId,
    id
  );
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
  return databases.getDocument(config.databaseId, config.streamsCollectionId, id);
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
  return databases.deleteDocument(config.databaseId, config.streamsCollectionId, id);
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
