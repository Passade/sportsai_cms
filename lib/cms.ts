import { config, databases, ID, Query, storage } from "./appwrite";

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
  streamId?: string;
};

export type CmsPrediction = {
  $id: string;
  userName?: string;
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
  camera: string;
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

function normalizeDateTimeMs(value?: string) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function isSameFixtureIdentity(
  existingFixture: CmsFixture,
  newFixture: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    competition: string;
  }
) {
  const sameHomeTeam =
    normalizeText(existingFixture.homeTeam) === normalizeText(newFixture.homeTeam);

  const sameAwayTeam =
    normalizeText(existingFixture.awayTeam) === normalizeText(newFixture.awayTeam);

  const sameCompetition =
    normalizeText(existingFixture.competition) ===
    normalizeText(newFixture.competition);

  const existingTime = normalizeDateTimeMs(existingFixture.matchDate);
  const newTime = normalizeDateTimeMs(newFixture.matchDate);

  // Treat fixtures as duplicates if the match time is the same minute.
  // This protects against tiny second/millisecond differences.
  const sameMatchMinute =
    existingTime > 0 &&
    newTime > 0 &&
    Math.abs(existingTime - newTime) < 60 * 1000;

  return sameHomeTeam && sameAwayTeam && sameCompetition && sameMatchMinute;
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
    streamId: input.streamId?.trim() || "",
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

  const team = await databases.createDocument(
    config.databaseId,
    config.teamsCollectionId,
    ID.unique(),
    data
  );

  await createCmsAuditLog({
    action: "create",
    entityType: "team",
    entityId: team.$id,
    entityTitle: data.name,
    message: `Created team ${data.name}`,
  });

  return team;
}

export async function updateCmsTeam(id: string, input: CreateTeamInput) {
  const data = {
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    logoUrl: input.logoUrl.trim(),
  };

  const team = await databases.updateDocument(
    config.databaseId,
    config.teamsCollectionId,
    id,
    data
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "team",
    entityId: id,
    entityTitle: data.name,
    message: `Updated team ${data.name}`,
  });

  return team;
}

export async function deleteCmsTeam(id: string) {
  await databases.deleteDocument(config.databaseId, config.teamsCollectionId, id);

  await createCmsAuditLog({
    action: "delete",
    entityType: "team",
    entityId: id,
    message: `Deleted team ${id}`,
  });

  return true;
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
  const player = await databases.createDocument(
    config.databaseId,
    config.playersCollectionId,
    ID.unique(),
    buildPlayerData(input)
  );

  await createCmsAuditLog({
    action: "create",
    entityType: "player",
    entityId: player.$id,
    entityTitle: input.name.trim(),
    message: `Created player ${input.name.trim()}`,
  });

  return player;
}

export async function updateCmsPlayer(id: string, input: CreatePlayerInput) {
  const player = await databases.updateDocument(
    config.databaseId,
    config.playersCollectionId,
    id,
    buildPlayerData(input)
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "player",
    entityId: id,
    entityTitle: input.name.trim(),
    message: `Updated player ${input.name.trim()}`,
  });

  return player;
}

export async function deleteCmsPlayer(id: string) {
  await databases.deleteDocument(
    config.databaseId,
    config.playersCollectionId,
    id
  );

  await createCmsAuditLog({
    action: "delete",
    entityType: "player",
    entityId: id,
    message: `Deleted player ${id}`,
  });

  return true;
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

export async function findDuplicateCmsFixture(input: CreateFixtureInput) {
  const newFixture = buildFixtureData(input);

  // No Appwrite field filters are used here on purpose.
  // This avoids needing extra Appwrite indexes and still prevents duplicates
  // for the current CMS scale by checking the latest 500 fixtures client-side.
  const fixtures = await getCmsFixtures();

  return fixtures.find((fixture) =>
    isSameFixtureIdentity(fixture, {
      homeTeam: newFixture.homeTeam,
      awayTeam: newFixture.awayTeam,
      matchDate: newFixture.matchDate,
      competition: newFixture.competition,
    })
  );
}

export async function createCmsFixture(input: CreateFixtureInput) {
  const duplicate = await findDuplicateCmsFixture(input);

  if (duplicate) {
    throw new Error(
      `This fixture already exists: ${duplicate.homeTeam || "Home"} vs ${
        duplicate.awayTeam || "Away"
      } on ${duplicate.matchDate || "the same date"} in ${
        duplicate.competition || "the same competition"
      }. Existing fixture ID: ${duplicate.$id}`
    );
  }

  const fixture = await databases.createDocument(
    config.databaseId,
    config.fixturesCollectionId,
    ID.unique(),
    buildFixtureData(input)
  );

  await createCmsAuditLog({
    action: "create",
    entityType: "fixture",
    entityId: fixture.$id,
    entityTitle: `${input.homeTeam.trim()} vs ${input.awayTeam.trim()}`,
    message: `Created fixture ${input.homeTeam.trim()} vs ${input.awayTeam.trim()}`,
  });

  return fixture;
}

export async function updateCmsFixture(id: string, input: CreateFixtureInput) {
  const duplicate = await findDuplicateCmsFixture(input);

  if (duplicate && duplicate.$id !== id) {
    throw new Error(
      `Another fixture already exists with the same teams, match date and competition. Existing fixture ID: ${duplicate.$id}`
    );
  }

  const fixture = await databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id,
    buildFixtureData(input)
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "fixture",
    entityId: id,
    entityTitle: `${input.homeTeam.trim()} vs ${input.awayTeam.trim()}`,
    message: `Updated fixture ${input.homeTeam.trim()} vs ${input.awayTeam.trim()}`,
  });

  return fixture;
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

  await createCmsAuditLog({
    action: "score",
    entityType: "fixture",
    entityId: fixtureId,
    entityTitle: `${normalizedFixture.homeTeam} vs ${normalizedFixture.awayTeam}`,
    message: `Scored predictions for ${normalizedFixture.homeTeam} vs ${normalizedFixture.awayTeam}`,
    metadata: {
      totalScored,
      actualWinner: getActualWinner(normalizedFixture),
    },
  });

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

  const event = await databases.createDocument(
    config.databaseId,
    config.streamsCollectionId,
    ID.unique(),
    {
      ...data,
      searchText: buildSearchText(data),
    }
  );

  await createCmsAuditLog({
    action: "create",
    entityType: "event",
    entityId: event.$id,
    entityTitle: title,
    message: `Created event ${title}`,
  });

  return event;
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

  const event = await databases.updateDocument(
    config.databaseId,
    config.streamsCollectionId,
    id,
    {
      ...data,
      searchText: buildSearchText(data),
    }
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "event",
    entityId: id,
    entityTitle: title,
    message: `Updated event ${title}`,
  });

  return event;
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

  await createCmsAuditLog({
    action: "delete",
    entityType: "event",
    entityId: eventId,
    message: `Deleted event ${eventId}`,
    metadata: {
      deletedFixtureIds: Array.from(fixtureIdsToDelete),
    },
  });

  return {
    deletedEventId: eventId,
    deletedFixtureIds: Array.from(fixtureIdsToDelete),
  };
}


/* COMMUNITY CMS */

export type CommunityPostKind = "poll" | "image" | "fixture" | "debate";

export type CmsCommunityPost = {
  $id: string;
  kind?: CommunityPostKind;
  source?: string;
  handle?: string;
  title?: string;
  question?: string;
  tag?: string;
  postImageUrl?: string;
  votesCount?: number;
  selectedOptionId?: string;
  createdBy?: string;
  sortOrder?: number;
  publishedAt?: string;
  isActive?: boolean;
  reactionsCount?: number;
};

export type CmsCommunityPostOption = {
  $id: string;
  postId?: string;
  label?: string;
  imageUrl?: string;
  votesCount?: number;
  percentage?: number;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateCommunityPostInput = {
  kind: CommunityPostKind;
  source: string;
  handle: string;
  title: string;
  question: string;
  tag: string;
  postImageUrl: string;
  sortOrder: string;
  publishedAt: string;
  isActive: boolean;
};

export type CreateCommunityPostOptionInput = {
  label: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};

function communityNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function communityDateTime(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function communityDateTimeForInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function buildCommunityPostCreateData(input: CreateCommunityPostInput) {
  const data: Record<string, any> = {
    kind: input.kind,
    source: input.source.trim(),
    handle: input.handle.trim(),
    title: input.title.trim(),
    question: input.question.trim(),
    tag: input.tag.trim(),
    votesCount: 0,
    selectedOptionId: "",
    createdBy: "cms",
    sortOrder: communityNumber(input.sortOrder, 999),
    publishedAt: communityDateTime(input.publishedAt),
    isActive: input.isActive,
    reactionsCount: 0,
  };

  const postImageUrl = input.postImageUrl.trim();

  if (postImageUrl) {
    data.postImageUrl = postImageUrl;
  }

  return data;
}

function buildCommunityPostUpdateData(input: CreateCommunityPostInput) {
  const data: Record<string, any> = {
    kind: input.kind,
    source: input.source.trim(),
    handle: input.handle.trim(),
    title: input.title.trim(),
    question: input.question.trim(),
    tag: input.tag.trim(),
    sortOrder: communityNumber(input.sortOrder, 999),
    publishedAt: communityDateTime(input.publishedAt),
    isActive: input.isActive,
  };

  const postImageUrl = input.postImageUrl.trim();

  if (postImageUrl) {
    data.postImageUrl = postImageUrl;
  }

  return data;
}

function buildCommunityOptionCreateData(
  postId: string,
  input: CreateCommunityPostOptionInput
) {
  const data: Record<string, any> = {
    postId,
    label: input.label.trim(),
    votesCount: 0,
    percentage: 0,
    sortOrder: communityNumber(input.sortOrder, 999),
    isActive: input.isActive,
  };

  const imageUrl = input.imageUrl.trim();

  if (imageUrl) {
    data.imageUrl = imageUrl;
  }

  return data;
}

function buildCommunityOptionUpdateData(input: CreateCommunityPostOptionInput) {
  const data: Record<string, any> = {
    label: input.label.trim(),
    sortOrder: communityNumber(input.sortOrder, 999),
    isActive: input.isActive,
  };

  const imageUrl = input.imageUrl.trim();

  if (imageUrl) {
    data.imageUrl = imageUrl;
  }

  return data;
}

export function normalizeCommunityPublishedAtForInput(value?: string) {
  return communityDateTimeForInput(value);
}

export async function getCmsCommunityPosts() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.communityPostsCollectionId,
    [Query.orderAsc("sortOrder"), Query.orderDesc("publishedAt"), Query.limit(500)]
  );

  return result.documents.map((post: any) => ({
    $id: post.$id,
    kind: post.kind || "image",
    source: post.source || "",
    handle: post.handle || "",
    title: post.title || "",
    question: post.question || "",
    tag: post.tag || "",
    postImageUrl: post.postImageUrl || "",
    votesCount: typeof post.votesCount === "number" ? post.votesCount : 0,
    selectedOptionId: post.selectedOptionId || "",
    createdBy: post.createdBy || "",
    sortOrder: typeof post.sortOrder === "number" ? post.sortOrder : 999,
    publishedAt: post.publishedAt || "",
    isActive: Boolean(post.isActive),
    reactionsCount:
      typeof post.reactionsCount === "number" ? post.reactionsCount : 0,
  })) as CmsCommunityPost[];
}

export async function getCmsCommunityPostById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    id
  );
}

export async function getCmsCommunityOptionsForPost(postId: string) {
  const result = await databases.listDocuments(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    [Query.equal("postId", postId), Query.orderAsc("sortOrder"), Query.limit(100)]
  );

  return result.documents.map((option: any) => ({
    $id: option.$id,
    postId: option.postId || "",
    label: option.label || "",
    imageUrl: option.imageUrl || "",
    votesCount: typeof option.votesCount === "number" ? option.votesCount : 0,
    percentage: typeof option.percentage === "number" ? option.percentage : 0,
    sortOrder: typeof option.sortOrder === "number" ? option.sortOrder : 999,
    isActive: Boolean(option.isActive),
  })) as CmsCommunityPostOption[];
}

export async function createCmsCommunityPost(
  input: CreateCommunityPostInput,
  options: CreateCommunityPostOptionInput[]
) {
  const post = await databases.createDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    ID.unique(),
    buildCommunityPostCreateData(input)
  );

  if (input.kind === "poll" || input.kind === "debate") {
    for (const option of options.filter((item) => item.label.trim())) {
      await databases.createDocument(
        config.databaseId,
        config.communityPostOptionsCollectionId,
        ID.unique(),
        buildCommunityOptionCreateData(post.$id, option)
      );
    }
  }

  await createCmsAuditLog({
    action: "create",
    entityType: "community_post",
    entityId: post.$id,
    entityTitle: input.title.trim() || input.question.trim(),
    message: `Created community post ${input.title.trim() || input.question.trim() || post.$id}`,
  });

  return post;
}

export async function updateCmsCommunityPost(
  id: string,
  input: CreateCommunityPostInput
) {
  const post = await databases.updateDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    id,
    buildCommunityPostUpdateData(input)
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "community_post",
    entityId: id,
    entityTitle: input.title.trim() || input.question.trim(),
    message: `Updated community post ${input.title.trim() || input.question.trim() || id}`,
  });

  return post;
}

async function safeDeleteCommunityDocument(
  collectionId: string,
  documentId: string
) {
  try {
    await databases.deleteDocument(config.databaseId, collectionId, documentId);
  } catch (error) {
    console.warn("Community delete skipped:", collectionId, documentId, error);
  }
}

async function listAllCommunityDocumentsByField(
  collectionId: string,
  field: string,
  value: string
) {
  const documents: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = await databases.listDocuments(
      config.databaseId,
      collectionId,
      [Query.equal(field, value), Query.limit(limit), Query.offset(offset)]
    );

    documents.push(...result.documents);

    if (result.documents.length < limit) {
      break;
    }

    offset += limit;
  }

  return documents;
}

export async function deleteCmsCommunityPost(id: string) {
  const options = await getCmsCommunityOptionsForPost(id);

  /*
   * Poll/debate posts have child option rows. Some installs also have
   * vote/reaction rows. Delete those first, then options, then the post.
   */

  for (const option of options) {
    try {
      const optionVotes = await listAllCommunityDocumentsByField(
        config.communityPostVotesCollectionId,
        "optionId",
        option.$id
      );

      for (const vote of optionVotes) {
        await safeDeleteCommunityDocument(
          config.communityPostVotesCollectionId,
          vote.$id
        );
      }
    } catch (error) {
      console.warn("Could not delete votes by optionId:", option.$id, error);
    }
  }

  try {
    const postVotes = await listAllCommunityDocumentsByField(
      config.communityPostVotesCollectionId,
      "postId",
      id
    );

    for (const vote of postVotes) {
      await safeDeleteCommunityDocument(
        config.communityPostVotesCollectionId,
        vote.$id
      );
    }
  } catch (error) {
    console.warn("Could not delete votes by postId:", id, error);
  }

  try {
    const reactions = await listAllCommunityDocumentsByField(
      config.communityPostReactionsCollectionId,
      "postId",
      id
    );

    for (const reaction of reactions) {
      await safeDeleteCommunityDocument(
        config.communityPostReactionsCollectionId,
        reaction.$id
      );
    }
  } catch (error) {
    console.warn("Could not delete reactions by postId:", id, error);
  }

  for (const option of options) {
    await safeDeleteCommunityDocument(
      config.communityPostOptionsCollectionId,
      option.$id
    );
  }

  await databases.deleteDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    id
  );

  await createCmsAuditLog({
    action: "delete",
    entityType: "community_post",
    entityId: id,
    message: `Deleted community post ${id}`,
  });

  return true;
}

export async function createCmsCommunityOption(
  postId: string,
  input: CreateCommunityPostOptionInput
) {
  return databases.createDocument(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    ID.unique(),
    buildCommunityOptionCreateData(postId, input)
  );
}

export async function updateCmsCommunityOption(
  optionId: string,
  input: CreateCommunityPostOptionInput
) {
  return databases.updateDocument(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    optionId,
    buildCommunityOptionUpdateData(input)
  );
}

export async function deleteCmsCommunityOption(optionId: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    optionId
  );
}


/* DASHBOARD ANALYTICS */

export type CmsDashboardAnalytics = {
  eventsTotal: number;
  eventsLive: number;
  fixturesTotal: number;
  fixturesUpcoming: number;
  fixturesLive: number;
  fixturesCompleted: number;
  teamsTotal: number;
  playersTotal: number;
  communityPostsTotal: number;
  communityPostsActive: number;
  pollsActive: number;
  predictionsTotal: number;
  mediaTotal: number;
};

async function countCmsDocuments(
  collectionId: string,
  queries: string[] = []
) {
  const result = await databases.listDocuments(
    config.databaseId,
    collectionId,
    [...queries, Query.limit(1)]
  );

  return result.total;
}

async function safeCountCmsDocuments(
  collectionId: string,
  queries: string[] = []
) {
  try {
    return await countCmsDocuments(collectionId, queries);
  } catch (error) {
    console.warn("Dashboard count failed:", collectionId, error);
    return 0;
  }
}

async function safeCountCmsMediaFiles() {
  try {
    const result = await storage.listFiles(config.mediaBucketId, [
      Query.limit(1),
    ]);

    return result.total;
  } catch (error) {
    console.warn("Dashboard media count failed:", error);
    return 0;
  }
}

export async function getCmsDashboardAnalytics() {
  const [
    eventsTotal,
    eventsLive,
    fixturesTotal,
    fixturesUpcoming,
    fixturesLive,
    fixturesCompleted,
    teamsTotal,
    playersTotal,
    communityPostsTotal,
    communityPostsActive,
    pollsActive,
    predictionsTotal,
    mediaTotal,
  ] = await Promise.all([
    safeCountCmsDocuments(config.streamsCollectionId),
    safeCountCmsDocuments(config.streamsCollectionId, [
      Query.equal("status", "live"),
    ]),
    safeCountCmsDocuments(config.fixturesCollectionId),
    safeCountCmsDocuments(config.fixturesCollectionId, [
      Query.equal("status", "upcoming"),
    ]),
    safeCountCmsDocuments(config.fixturesCollectionId, [
      Query.equal("status", "live"),
    ]),
    safeCountCmsDocuments(config.fixturesCollectionId, [
      Query.equal("status", "completed"),
    ]),
    safeCountCmsDocuments(config.teamsCollectionId),
    safeCountCmsDocuments(config.playersCollectionId),
    safeCountCmsDocuments(config.communityPostsCollectionId),
    safeCountCmsDocuments(config.communityPostsCollectionId, [
      Query.equal("isActive", true),
    ]),
    safeCountCmsDocuments(config.communityPostsCollectionId, [
      Query.equal("kind", "poll"),
      Query.equal("isActive", true),
    ]),
    safeCountCmsDocuments(config.predictionsCollectionId),
    safeCountCmsMediaFiles(),
  ]);

  return {
    eventsTotal,
    eventsLive,
    fixturesTotal,
    fixturesUpcoming,
    fixturesLive,
    fixturesCompleted,
    teamsTotal,
    playersTotal,
    communityPostsTotal,
    communityPostsActive,
    pollsActive,
    predictionsTotal,
    mediaTotal,
  } as CmsDashboardAnalytics;
}


/* CMS AUDIT LOGS */

export type CmsAuditAction =
  | "create"
  | "update"
  | "delete"
  | "upload"
  | "score"
  | "login"
  | "logout"
  | "system";

export type CmsAuditLog = {
  $id: string;
  action: CmsAuditAction;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  message: string;
  actor: string;
  createdAt: string;
  metadata?: string;
};

export type CreateCmsAuditLogInput = {
  action: CmsAuditAction;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  message: string;
  metadata?: Record<string, any> | string;
};

function normalizeAuditMetadata(metadata?: Record<string, any> | string) {
  if (!metadata) return "";

  if (typeof metadata === "string") {
    return metadata;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return "";
  }
}

export async function createCmsAuditLog(input: CreateCmsAuditLogInput) {
  try {
    return await databases.createDocument(
      config.databaseId,
      config.cmsAuditLogsCollectionId,
      ID.unique(),
      {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || "",
        entityTitle: input.entityTitle || "",
        message: input.message,
        actor: "cms",
        createdAt: new Date().toISOString(),
        metadata: normalizeAuditMetadata(input.metadata),
      }
    );
  } catch (error) {
    /*
     * Audit logging should never block the CMS action itself.
     * If permissions/env are wrong, log to console and let the main action continue.
     */
    console.warn("Audit log failed:", error);
    return null;
  }
}

export async function getCmsAuditLogs() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.cmsAuditLogsCollectionId,
    [Query.orderDesc("createdAt"), Query.limit(500)]
  );

  return result.documents.map((log: any) => ({
    $id: log.$id,
    action: log.action || "system",
    entityType: log.entityType || "",
    entityId: log.entityId || "",
    entityTitle: log.entityTitle || "",
    message: log.message || "",
    actor: log.actor || "cms",
    createdAt: log.createdAt || log.$createdAt || "",
    metadata: log.metadata || "",
  })) as CmsAuditLog[];
}

export async function deleteCmsAuditLog(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.cmsAuditLogsCollectionId,
    id
  );
}


/* FIXTURE CHAT ADMIN */

export type CmsFixtureChat = {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  fixtureId?: string;
  userId?: string;
  userName?: string;
  message?: string;
  replyToMessageId?: string;
  replyToUserName?: string;
  replyToMessage?: string;
  reactions?: string;
  isHidden?: boolean;
};

export type UpdateCmsFixtureChatInput = {
  userName: string;
  message: string;
  replyToUserName: string;
  replyToMessage: string;
  reactions: string;
};

function normalizeCmsFixtureChat(chat: any) {
  return {
    $id: chat.$id,
    $createdAt: chat.$createdAt,
    $updatedAt: chat.$updatedAt,
    fixtureId: chat.fixtureId || "",
    userId: chat.userId || "",
    userName: chat.userName || "",
    message: chat.message || "",
    replyToMessageId: chat.replyToMessageId || "",
    replyToUserName: chat.replyToUserName || "",
    replyToMessage: chat.replyToMessage || "",
    reactions: chat.reactions || "{}",
    isHidden: Boolean(chat.isHidden),
  } as CmsFixtureChat;
}

export async function getCmsFixtureChats() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.fixtureChatsCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(500)]
  );

  return result.documents.map(normalizeCmsFixtureChat);
}

export async function getCmsFixtureChatsByFixtureId(fixtureId: string) {
  const result = await databases.listDocuments(
    config.databaseId,
    config.fixtureChatsCollectionId,
    [
      Query.equal("fixtureId", fixtureId),
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]
  );

  return result.documents.map(normalizeCmsFixtureChat);
}

export async function updateCmsFixtureChat(
  id: string,
  input: UpdateCmsFixtureChatInput
) {
  const updated = await databases.updateDocument(
    config.databaseId,
    config.fixtureChatsCollectionId,
    id,
    {
      userName: input.userName.trim(),
      message: input.message.trim(),
      replyToUserName: input.replyToUserName.trim(),
      replyToMessage: input.replyToMessage.trim(),
      reactions: input.reactions.trim() || "{}",
    }
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "fixture_chat",
    entityId: id,
    entityTitle: input.userName.trim(),
    message: `Updated fixture chat message from ${input.userName.trim() || id}`,
  });

  return normalizeCmsFixtureChat(updated);
}

export async function clearCmsFixtureChatReactions(id: string) {
  const updated = await databases.updateDocument(
    config.databaseId,
    config.fixtureChatsCollectionId,
    id,
    {
      reactions: "{}",
    }
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "fixture_chat",
    entityId: id,
    message: `Cleared reactions for fixture chat ${id}`,
  });

  return normalizeCmsFixtureChat(updated);
}


export async function setCmsFixtureChatHidden(id: string, isHidden: boolean) {
  const updated = await databases.updateDocument(
    config.databaseId,
    config.fixtureChatsCollectionId,
    id,
    {
      isHidden,
    }
  );

  await createCmsAuditLog({
    action: "update",
    entityType: "fixture_chat",
    entityId: id,
    message: `${isHidden ? "Hid" : "Unhid"} fixture chat ${id}`,
    metadata: {
      isHidden,
    },
  });

  return normalizeCmsFixtureChat(updated);
}

export async function deleteCmsFixtureChat(id: string) {
  await databases.deleteDocument(
    config.databaseId,
    config.fixtureChatsCollectionId,
    id
  );

  await createCmsAuditLog({
    action: "delete",
    entityType: "fixture_chat",
    entityId: id,
    message: `Deleted fixture chat ${id}`,
  });

  return true;
}
