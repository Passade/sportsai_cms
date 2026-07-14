"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import {
  CmsTeam,
  EventStatus,
  VodType,
  deleteCmsEventAndFixture,
  getCmsEventById,
  getCmsTeams,
  updateCmsEvent,
} from "@/lib/cms";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function splitMatchDate(value?: string) {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const iso = localDate.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">{label}</span> : null}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">{label}</span> : null}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
}) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">{label}</span> : null}
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#29496d] outline-none focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TeamNameField({
  label,
  value,
  onChange,
  placeholder,
  teams,
  datalistId,
  required = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  teams: CmsTeam[];
  datalistId: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">{label}</span> : null}
      <input
        type="text"
        list={datalistId}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />
      <datalist id={datalistId}>
        {teams.map((team) => <option key={team.$id} value={team.name || ""} />)}
      </datalist>
    </label>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="relative border border-slate-300 bg-white px-6 pb-6 pt-5 shadow-sm">
      <legend className="px-3 text-xl font-bold text-[#8ba0b6]">{title}</legend>
      {children}
    </fieldset>
  );
}

function CardPreview({
  title,
  subtitle,
  imageUrl,
  orientation = "horizontal",
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
  orientation?: "horizontal" | "vertical";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const previewClassName =
    orientation === "vertical"
      ? "mx-auto h-[420px] w-[220px] object-contain"
      : "h-[280px] w-full object-contain";

  return (
    <div className="border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#8ba0b6]">
          {title}
        </p>
        <p className="mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-400">
          {subtitle}
        </p>
      </div>

      {imageUrl && !imageFailed ? (
        <div className="flex min-h-[280px] items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 p-3">
          <img
            key={imageUrl}
            src={imageUrl}
            alt={title}
            className={previewClassName}
            onLoad={() => setImageFailed(false)}
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : imageUrl && imageFailed ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-extrabold text-red-600">
            Could not load this preview
          </p>
          <p className="max-w-md break-all text-xs font-semibold text-red-500">
            {imageUrl}
          </p>
        </div>
      ) : (
        <div className="flex min-h-[280px] items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-400">
          No image uploaded yet
        </div>
      )}
    </div>
  );
}

const SPORT_OPTIONS = [
  { label: "Rugby", value: "Rugby" },
  { label: "Football", value: "Football" },
  { label: "Hockey", value: "Hockey" },
  { label: "Cricket", value: "Cricket" },
  { label: "Basketball", value: "Basketball" },
  { label: "Netball", value: "Netball" },
  { label: "Waterpolo", value: "Waterpolo" },
];

const STATUS_OPTIONS = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Live", value: "live" },
  { label: "Waiting", value: "waiting" },
  { label: "Completed", value: "completed" },
  { label: "VOD", value: "vod" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Hidden", value: "hidden" },
];

function buildMatchDate(date: string, startTime: string) {
  if (!date || !startTime) return "";
  return `${date}T${startTime}`;
}

function buildOptionalDateTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}


type FmsFixtureCard = {
  id?: string | null;
  orientation?: string | null;
  preview_url?: string | null;
} | null;

type FmsFixture = {
  fixture_code?: string | null;
  match_title?: string | null;
  federation?: string | null;
  federation_logo?: string | null;
  division?: string | null;
  division_logo?: string | null;
  sport?: string | null;
  sport_logo?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  team_a?: {
    id?: string | null;
    name?: string | null;
    abbreviation?: string | null;
    logo_url?: string | null;
    color?: string | null;
  } | null;
  team_b?: {
    id?: string | null;
    name?: string | null;
    abbreviation?: string | null;
    logo_url?: string | null;
    color?: string | null;
  } | null;
  age_group?: string | null;
  gender?: string | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  card_horizontal?: FmsFixtureCard;
  card_vertical?: FmsFixtureCard;
};

const FMS_FIXTURE_ENDPOINT =
  "https://dofdaonihjosfcmowewq.supabase.co/functions/v1/get-fixture-by-code";

const FMS_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_FMS_SUPABASE_ANON_KEY || "";

function normaliseSport(value?: string | null) {
  if (!value) return "Rugby";
  const found = SPORT_OPTIONS.find(
    (option) => option.value.toLowerCase() === value.toLowerCase()
  );
  return found?.value || value;
}

function normaliseGender(value?: string | null) {
  if (!value) return "Boys";
  const lower = value.toLowerCase();
  if (lower === "girls") return "Girls";
  if (lower === "mixed") return "Mixed";
  return "Boys";
}


async function copyPosterToAppwrite(
  imageUrl?: string | null,
  filenameHint?: string,
  orientation: "horizontal" | "vertical" = "horizontal"
) {
  const cleanUrl = String(imageUrl || "").trim();

  if (!cleanUrl) {
    return "";
  }

  const response = await fetch("/api/import-thumbnail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl: cleanUrl,
      filenameHint: filenameHint || "fms-poster",
      orientation,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error ||
        `Could not copy the FMS image into Appwrite (${response.status}).`
    );
  }

  if (!result?.publicUrl) {
    throw new Error("Appwrite upload completed without returning a public URL.");
  }

  return String(result.publicUrl);
}

async function importFixtureByCode(code: string): Promise<FmsFixture> {
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error("Please enter an FMS fixture code first.");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (FMS_SUPABASE_ANON_KEY) {
    headers.Authorization = `Bearer ${FMS_SUPABASE_ANON_KEY}`;
    headers.Apikey = FMS_SUPABASE_ANON_KEY;
  }

  const response = await fetch(
    `${FMS_FIXTURE_ENDPOINT}?code=${encodeURIComponent(cleanCode)}`,
    {
      method: "GET",
      headers,
    }
  );

  if (response.status === 404) {
    throw new Error(`Fixture code "${cleanCode}" was not found. Please check and try again.`);
  }

  if (!response.ok) {
    throw new Error(`Import failed (${response.status}). Please try again.`);
  }

  const result = await response.json();

  if (!result?.data) {
    throw new Error("Import failed because the fixture response was empty.");
  }

  return result.data;
}

function getTimeFromDateTime(value?: string) {
  if (!value) return "";
  const split = splitMatchDate(value);
  return split.time;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importingFixture, setImportingFixture] = useState(false);
  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [fmsFixtureCode, setFmsFixtureCode] = useState("");
  const [federation, setFederation] = useState("Zimbabwe Schools");
  const [division, setDivision] = useState("Rugby");
  const [sport, setSport] = useState("Rugby");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("Boys");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Zimbabwe");

  const [streamedBySportsAi, setStreamedBySportsAi] = useState("YES");
  const [technicians, setTechnicians] = useState("");
  const [commentators, setCommentators] = useState("");
  const [stitchingBy, setStitchingBy] = useState("");
  const [description, setDescription] = useState("");
  const [verticalCard, setVerticalCard] = useState("");

  const [streamUrl, setStreamUrl] = useState("");
  const [vodUrl, setVodUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");

  const [status, setStatus] = useState<EventStatus>("upcoming");
  const [vodType, setVodType] = useState<VodType>("video");
  const [fixturesId, setFixturesId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const matchDate = useMemo(() => buildMatchDate(date, startTime), [date, startTime]);

  useEffect(() => {
    async function loadTeams() {
      try {
        setTeamsLoading(true);
        const result = await getCmsTeams();
        setTeams(result);
      } catch (error) {
        console.error(error);
        alert("Could not load teams from Appwrite.");
      } finally {
        setTeamsLoading(false);
      }
    }
    loadTeams();
  }, []);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        const event: any = await getCmsEventById(eventId);
        const split = splitMatchDate(event.matchDate);

        setTitle(event.title || "");
        setSport(event.sport || "Rugby");
        setVenue(event.venue || "");
        setCity(event.city || "");
        setCountry(event.country || "Zimbabwe");
        setStatus((event.status || "upcoming") as EventStatus);
        setVodType((event.vodType || "video") as VodType);
        setDate(split.date);
        setStartTime(split.time);
        setHomeTeam(event.homeTeam || "");
        setAwayTeam(event.awayTeam || "");
        setStreamUrl(event.streamUrl || "");
        setVodUrl(event.vodUrl || "");
        setThumbnail(event.thumbnail || "");
        setFixturesId(event.fixturesId || "");
        setDescription(event.description || "");
        setIsFeatured(Boolean(event.isFeatured));

        setFmsFixtureCode(event.fmsFixtureCode || "");
        setFederation(event.federation || "Zimbabwe Schools");
        setDivision(event.division || event.competition || "Rugby");
        setEndTime(getTimeFromDateTime(event.endTime));
        setAgeGroup(event.ageGroup || "");
        setGender(event.gender || "Boys");
        setStreamedBySportsAi(event.streamedBySportsAi || "YES");
        setTechnicians(event.technicians || "");
        setCommentators(event.commentators || "");
        setStitchingBy(event.stitchingBy || "");
        setVerticalCard(event.verticalCard || "");
      } catch (error) {
        console.error(error);
        alert("Could not load event.");
      } finally {
        setLoading(false);
      }
    }

    if (eventId) loadEvent();
  }, [eventId]);


  function applyImportedFixture(fixture: FmsFixture) {
    setFmsFixtureCode(fixture.fixture_code || fmsFixtureCode.trim().toUpperCase());
    setTitle(fixture.match_title || "");
    setFederation(fixture.federation || "Zimbabwe Schools");
    setDivision(fixture.division || "Rugby");
    setSport(normaliseSport(fixture.sport));
    setDate(fixture.date || "");
    setStartTime(fixture.start_time || "");
    setEndTime(fixture.end_time || "");
    setHomeTeam(fixture.team_a?.name || "");
    setAwayTeam(fixture.team_b?.name || "");
    setAgeGroup(fixture.age_group || "");
    setGender(normaliseGender(fixture.gender));
    setVenue(fixture.venue || "");
    setCity(fixture.city || "");
    setCountry(fixture.country || "Zimbabwe");
    setThumbnail(fixture.card_horizontal?.preview_url || "");
    setVerticalCard(fixture.card_vertical?.preview_url || "");
  }

  async function handleImportFixture() {
    try {
      setImportingFixture(true);

      const fixture = await importFixtureByCode(fmsFixtureCode);
      applyImportedFixture(fixture);

      const filenameBase =
        fixture.fixture_code ||
        fixture.match_title ||
        fmsFixtureCode.trim().toUpperCase() ||
        "fms-fixture";

      const [horizontalUrl, verticalUrl] = await Promise.all([
        copyPosterToAppwrite(
          fixture.card_horizontal?.preview_url,
          `${filenameBase}-horizontal`,
          "horizontal"
        ),
        copyPosterToAppwrite(
          fixture.card_vertical?.preview_url,
          `${filenameBase}-vertical`,
          "vertical"
        ),
      ]);

      if (horizontalUrl) {
        setThumbnail(horizontalUrl);
      }

      if (verticalUrl) {
        setVerticalCard(verticalUrl);
      }

      alert(
        "Fixture imported and both compressed posters were copied into Appwrite Storage."
      );
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not import fixture from FMS."
      );
    } finally {
      setImportingFixture(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!homeTeam.trim() || !awayTeam.trim()) {
      alert("Please add both Team A and Team B.");
      return;
    }

    if (!date || !startTime) {
      alert("Please add the match date and start time.");
      return;
    }

    try {
      setSubmitting(true);
      await updateCmsEvent(eventId, {
        title: title.trim() || `${homeTeam.trim()} Vs ${awayTeam.trim()}`,
        status,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        matchDate,
        venue: venue.trim(),
        city: city.trim(),
        country: country.trim(),
        thumbnail: thumbnail.trim(),
        streamUrl: streamUrl.trim(),
        vodUrl: vodUrl.trim(),
        description: description.trim(),
        competition: division.trim() || federation.trim(),
        isFeatured,
        sport: sport.trim(),
        vodType,

        fmsFixtureCode: fmsFixtureCode.trim(),
        federation: federation.trim(),
        division: division.trim(),
        endTime: buildOptionalDateTime(date, endTime),
        ageGroup: ageGroup.trim(),
        gender: gender.trim(),
        streamedBySportsAi: streamedBySportsAi.trim(),
        technicians: technicians.trim(),
        commentators: commentators.trim(),
        stitchingBy: stitchingBy.trim(),
        verticalCard: verticalCard.trim(),
      } as any);

      router.push("/events");
    } catch (error) {
      console.error(error);
      alert("Could not update event. Check your Appwrite fields and permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this event and all linked fixtures? This cannot be undone.");
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await deleteCmsEventAndFixture(eventId, fixturesId);
      router.push("/events");
    } catch (error) {
      console.error(error);
      alert("Could not delete event and linked fixtures. Check your Appwrite permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <CmsAuthGuard>
        <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
          <div className="mx-auto max-w-7xl">
            <Link href="/events" className="text-lg font-semibold text-cyan-600">Back to events list</Link>
            <div className="mt-10 border border-slate-200 bg-white p-8">
              <p className="text-xl font-semibold text-slate-500">Loading event...</p>
            </div>
          </div>
        </main>
      </CmsAuthGuard>
    );
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
        <Link href="/events" className="text-lg font-semibold text-cyan-600">Back to events list</Link>

        <h1 className="mt-3 text-center text-4xl font-extrabold text-[#141248]">Edit Fixture</h1>

        <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-7xl space-y-8">
          <Fieldset title="Fixture Details">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4">
                <TextField label="FMS Fixture Code" value={fmsFixtureCode} onChange={setFmsFixtureCode} placeholder="RUGTHSWSO040726075A" />
              </div>
              <div className="col-span-12 md:col-span-4 flex items-end">
                <button type="button" onClick={handleImportFixture} disabled={importingFixture || submitting} className="h-11 w-full bg-cyan-500 px-4 text-sm font-extrabold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60">{importingFixture ? "Importing..." : "Import Fixture from FMS"}</button>
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextField label="Match Title" value={title} onChange={setTitle} placeholder="Heritage Vs Wise Owl" />
              </div>

              <div className="col-span-12 md:col-span-4">
                <TextField label="Federation" value={federation} onChange={setFederation} placeholder="Zimbabwe Schools" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextField label="Division" value={division} onChange={setDivision} placeholder="Rugby" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <SelectField label="Sport" value={sport} onChange={setSport} options={SPORT_OPTIONS} required />
              </div>

              <div className="col-span-12 md:col-span-4">
                <TextField label="Date" type="date" value={date} onChange={setDate} required />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextField label="Start Time" type="time" value={startTime} onChange={setStartTime} required />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextField label="End Time" type="time" value={endTime} onChange={setEndTime} />
              </div>

              <div className="col-span-12 md:col-span-4">
                <TeamNameField label="Team A" value={homeTeam} onChange={setHomeTeam} teams={teams} datalistId="edit-home-team-options" placeholder={teamsLoading ? "Loading teams..." : "Heritage"} required />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TeamNameField label="Team B" value={awayTeam} onChange={setAwayTeam} teams={teams} datalistId="edit-away-team-options" placeholder={teamsLoading ? "Loading teams..." : "Wise Owl"} required />
              </div>
              <div className="col-span-6 md:col-span-2">
                <TextField label="Age Group" value={ageGroup} onChange={setAgeGroup} placeholder="2nds vs 1st" />
              </div>
              <div className="col-span-6 md:col-span-2">
                <SelectField label="Gender" value={gender} onChange={setGender} options={[{ label: "Boys", value: "Boys" }, { label: "Girls", value: "Girls" }, { label: "Mixed", value: "Mixed" }]} />
              </div>

              <div className="col-span-12 md:col-span-4">
                <TextField label="Venue" value={venue} onChange={setVenue} placeholder="The Heritage School" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextField label="City" value={city} onChange={setCity} placeholder="Harare" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextField label="Country" value={country} onChange={setCountry} placeholder="Zimbabwe" />
              </div>
            </div>
          </Fieldset>

          <Fieldset title="Streaming Details">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4">
                <SelectField label="Streamed By Sports AI" value={streamedBySportsAi} onChange={setStreamedBySportsAi} options={[{ label: "YES", value: "YES" }, { label: "NO", value: "NO" }]} />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextAreaField label="Technition(s)" value={technicians} onChange={setTechnicians} placeholder="Tech's name" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextAreaField label="Comentator(s)" value={commentators} onChange={setCommentators} placeholder="Darlington Matambanadzo, TC" />
              </div>

              <div className="col-span-12 md:col-span-4">
                <TextField label="Stiching By" value={stitchingBy} onChange={setStitchingBy} placeholder="Stitcher" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <SelectField label="Status" value={status} onChange={(value) => setStatus(value as EventStatus)} options={STATUS_OPTIONS} />
              </div>
              <div className="col-span-12 md:col-span-4">
                <SelectField label="Production / VOD Type" value={vodType} onChange={(value) => setVodType(value as VodType)} options={[{ label: "Auto Camera / Video", value: "video" }, { label: "YouTube", value: "youtube" }]} />
              </div>

              <div className="col-span-12">
                <TextField label="Event Description" value={description} onChange={setDescription} placeholder="Event description" />
              </div>

              <div className="col-span-12 md:col-span-6 space-y-3">
                <TextField
                  label="HORIZONTAL CARD / THUMBNAIL URL"
                  value={thumbnail}
                  onChange={setThumbnail}
                  placeholder="Paste thumbnail URL or upload below"
                />
                <CmsImageUpload
                  label="Upload Horizontal Card / Thumbnail"
                  value={thumbnail}
                  onUploaded={setThumbnail}
                />
                <CardPreview
                  title="Horizontal Card / Thumbnail"
                  subtitle="Uploads are compressed: Ad banner. Target max size: about 400 KB."
                  imageUrl={thumbnail}
                  orientation="horizontal"
                />
              </div>

              <div className="col-span-12 md:col-span-6 space-y-3">
                <TextField
                  label="VERTICAL CARD URL"
                  value={verticalCard}
                  onChange={setVerticalCard}
                  placeholder="Paste vertical card URL or upload below"
                />
                <CmsImageUpload
                  label="Upload Vertical Card"
                  value={verticalCard}
                  onUploaded={setVerticalCard}
                />
                <CardPreview
                  title="Vertical Card"
                  subtitle="Uploads are compressed. Target max size: about 400 KB."
                  imageUrl={verticalCard}
                  orientation="vertical"
                />
              </div>
            </div>
          </Fieldset>

          <Fieldset title="Streaming Keys">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <TextField label="Live Stream Url" value={streamUrl} onChange={setStreamUrl} placeholder="Live Stream Url" />
              </div>
              <div className="col-span-12 md:col-span-6">
                <TextField label="Vod Url" value={vodUrl} onChange={setVodUrl} placeholder="Vod Url" />
              </div>
              <label className="col-span-12 flex items-center gap-3 text-sm font-bold text-[#29496d]">
                <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="h-5 w-5" />
                Featured event
              </label>

            </div>
          </Fieldset>

          <div className="flex justify-between gap-4 pb-20">
            <button type="button" onClick={handleDelete} disabled={submitting} className="border border-red-300 bg-white px-10 py-4 text-base font-extrabold text-red-600 hover:bg-red-50 disabled:opacity-50">
              {submitting ? "Working..." : "Delete Event"}
            </button>
            <div className="flex gap-4">
              <button type="button" onClick={() => router.back()} disabled={submitting} className="border border-slate-300 bg-white px-10 py-4 text-base font-extrabold text-[#29496d] disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting} className="bg-cyan-500 px-10 py-4 text-base font-extrabold text-white hover:bg-cyan-600 disabled:opacity-50">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}