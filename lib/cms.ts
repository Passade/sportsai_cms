import { config, databases, ID, Query } from "./appwrite";

export type EventStatus =
  | "upcoming"
  | "live"
  | "waiting"
  | "completed"
  | "cancelled"
  | "vod"
  | "hidden";

export type FixtureStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled"
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

export type CmsFixture = {
  $id: string;
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  communityName?: string;
  competition?: string;
  venue?: string;
  matchDate?: string;
  status?: FixtureStatus | string;
  homeScore?: number;
  awayScore?: number;
  isStreamed?: boolean;
  streamId?: string;
  searchText?: string;
};

export type CreateFixtureInput = {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  communityName: string;
  competition: string;
  venue: string;
  matchDate: string;
  status: FixtureStatus;
  homeScore: string;
  awayScore: string;
  isStreamed: boolean;
  streamId: string;
};

export type CmsPrediction = {
  $id: string;
  userName?: string;
  fixtureId?: string;
  sport?: string;
  communityName?: string;
  predictedWinner?: string;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  pointsAwarded?: number;
  userId?: string;
  predictionStatus?: string;
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
    data.communityName,
    data.homeScore,
    data.awayScore,
    data.streamId,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
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

function toDateTimeLocalInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function getActualWinner(fixture: CmsFixture) {
  const homeScore = Number(fixture.homeScore ?? 0);
  const awayScore = Number(fixture.awayScore ?? 0);

  if (homeScore > awayScore) {
    return fixture.homeTeam || "Home";
  }

  if (awayScore > homeScore) {
    return fixture.awayTeam || "Away";
  }

  return "Draw";
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

function buildFixtureData(input: CreateFixtureInput) {
  const data = {
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    sport: input.sport.trim(),
    communityName: input.communityName.trim(),
    competition: input.competition.trim(),
    venue: input.venue.trim(),
    matchDate: toIsoDateTime(input.matchDate),
    status: input.status,
    homeScore: toInteger(input.homeScore),
    awayScore: toInteger(input.awayScore),
    isStreamed: input.isStreamed,
    streamId: input.streamId.trim(),
  };

  return {
    ...data,
    searchText: buildSearchText(data),
  };
}

export function normalizeDateForInput(value?: string) {
  return toDateInputValue(value);
}

export function normalizeDateTimeForInput(value?: string) {
  return toDateTimeLocalInputValue(value);
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

export async function getCmsFixtures() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.fixturesCollectionId,
    [Query.orderDesc("matchDate"), Query.limit(500)]
  );

  return result.documents.map((fixture: any) => ({
    $id: fixture.$id,
    homeTeam: fixture.homeTeam || "",
    awayTeam: fixture.awayTeam || "",
    sport: fixture.sport || "",
    communityName: fixture.communityName || "",
    competition: fixture.competition || "",
    venue: fixture.venue || "",
    matchDate: fixture.matchDate || "",
    status: fixture.status || "upcoming",
    homeScore: typeof fixture.homeScore === "number" ? fixture.homeScore : 0,
    awayScore: typeof fixture.awayScore === "number" ? fixture.awayScore : 0,
    isStreamed: Boolean(fixture.isStreamed),
    streamId: fixture.streamId || "",
    searchText: fixture.searchText || "",
  }));
}

export async function getCmsFixtureById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id
  );
}

export async function createCmsFixture(input: CreateFixtureInput) {
  return databases.createDocument(
    config.databaseId,
    config.fixturesCollectionId,
    ID.unique(),
    buildFixtureData(input)
  );
}

export async function updateCmsFixture(id: string, input: CreateFixtureInput) {
  return databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id,
    buildFixtureData(input)
  );
}

export async function updateCmsFixtureStatus(id: string, status: FixtureStatus) {
  const fixture: any = await getCmsFixtureById(id);

  const data = {
    homeTeam: fixture.homeTeam || "",
    awayTeam: fixture.awayTeam || "",
    sport: fixture.sport || "",
    communityName: fixture.communityName || "",
    competition: fixture.competition || "",
    venue: fixture.venue || "",
    matchDate: fixture.matchDate || "",
    status,
    homeScore: typeof fixture.homeScore === "number" ? fixture.homeScore : 0,
    awayScore: typeof fixture.awayScore === "number" ? fixture.awayScore : 0,
    isStreamed: Boolean(fixture.isStreamed),
    streamId: fixture.streamId || "",
  };

  return databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id,
    {
      status,
      searchText: buildSearchText(data),
    }
  );
}

export async function deleteCmsFixture(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id
  );
}

export async function getCmsPredictionsForFixture(fixtureId: string) {
  const result = await databases.listDocuments(
    config.databaseId,
    config.predictionsCollectionId,
    [Query.equal("fixtureId", fixtureId), Query.limit(500)]
  );

  return result.documents.map((prediction: any) => ({
    $id: prediction.$id,
    userName: prediction.userName || "",
    fixtureId: prediction.fixtureId || "",
    sport: prediction.sport || "",
    communityName: prediction.communityName || "",
    predictedWinner: prediction.predictedWinner || "",
    predictedHomeScore:
      typeof prediction.predictedHomeScore === "number"
        ? prediction.predictedHomeScore
        : 0,
    predictedAwayScore:
      typeof prediction.predictedAwayScore === "number"
        ? prediction.predictedAwayScore
        : 0,
    pointsAwarded:
      typeof prediction.pointsAwarded === "number" ? prediction.pointsAwarded : 0,
    userId: prediction.userId || "",
    predictionStatus: prediction.predictionStatus || "",
  }));
}

export function calculatePredictionPoints(
  fixture: CmsFixture,
  prediction: CmsPrediction
) {
  const actualWinner = getActualWinner(fixture);
  const predictedWinner = prediction.predictedWinner || "";
  const winnerCorrect =
    normalizeText(predictedWinner) === normalizeText(actualWinner) ||
    (normalizeText(actualWinner) === "draw" &&
      ["draw", "tie"].includes(normalizeText(predictedWinner)));

  const exactScore =
    Number(prediction.predictedHomeScore ?? 0) ===
      Number(fixture.homeScore ?? 0) &&
    Number(prediction.predictedAwayScore ?? 0) === Number(fixture.awayScore ?? 0);

  let points = 0;

  if (winnerCorrect) {
    points += 3;
  }

  if (exactScore) {
    points += 2;
  }

  return {
    actualWinner,
    winnerCorrect,
    exactScore,
    points,
  };
}

export async function scoreCmsPredictionsForFixture(fixtureId: string) {
  const fixture: any = await getCmsFixtureById(fixtureId);
  const predictions = await getCmsPredictionsForFixture(fixtureId);

  const normalizedFixture: CmsFixture = {
    $id: fixture.$id,
    homeTeam: fixture.homeTeam || "",
    awayTeam: fixture.awayTeam || "",
    homeScore: typeof fixture.homeScore === "number" ? fixture.homeScore : 0,
    awayScore: typeof fixture.awayScore === "number" ? fixture.awayScore : 0,
  };

  let totalScored = 0;

  for (const prediction of predictions) {
    const result = calculatePredictionPoints(normalizedFixture, prediction);

    await databases.updateDocument(
      config.databaseId,
      config.predictionsCollectionId,
      prediction.$id,
      {
        pointsAwarded: result.points,
        predictionStatus: "scored",
      }
    );

    totalScored += 1;
  }

  await databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    fixtureId,
    {
      status: "completed",
    }
  );

  return {
    totalScored,
    actualWinner: getActualWinner(normalizedFixture),
  };
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
