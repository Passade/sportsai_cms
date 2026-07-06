"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import {
  CmsTeam,
  EventStatus,
  VodType,
  createCmsEvent,
  getCmsTeams,
} from "@/lib/cms";
import { getCmsErrorMessage, useCmsToast } from "@/components/cms-toast-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
      {label ? (
        <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

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
      {label ? (
        <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

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
      {label ? (
        <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#29496d] outline-none focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
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
      {label ? (
        <span className="mb-1 block text-xs font-bold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

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
        {teams.map((team) => (
          <option key={team.$id} value={team.name || ""} />
        ))}
      </datalist>
    </label>
  );
}

function Fieldset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="relative border border-slate-300 bg-white px-6 pb-6 pt-5 shadow-sm">
      <legend className="px-3 text-xl font-bold text-[#8ba0b6]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function CardPreview({
  title,
  subtitle,
  imageUrl,
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#8ba0b6]">
            {title}
          </p>
          <p className="mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="max-h-72 w-full object-contain"
        />
      ) : (
        <div className="flex h-48 items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-400">
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
};

const FMS_FIXTURE_ENDPOINT =
  "https://dofdaonihjosfcmowewq.supabase.co/functions/v1/get-fixture-by-code";

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

async function importFixtureByCode(code: string): Promise<FmsFixture> {
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error("Please enter an FMS fixture code first.");
  }

  const response = await fetch(
    `${FMS_FIXTURE_ENDPOINT}?code=${encodeURIComponent(cleanCode)}`
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

export default function CreateEventPage() {
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importingFixture, setImportingFixture] = useState(false);

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
  const [isFeatured, setIsFeatured] = useState(true);

  const matchDate = useMemo(
    () => buildMatchDate(date, startTime),
    [date, startTime]
  );

  useEffect(() => {
    async function loadTeams() {
      try {
        setTeamsLoading(true);
        const result = await getCmsTeams();
        setTeams(result);
      } catch (error) {
        console.error(error);
        showError("Could not load teams", getCmsErrorMessage(error));
      } finally {
        setTeamsLoading(false);
      }
    }

    loadTeams();
  }, [showError]);


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
  }

  async function handleImportFixture() {
    try {
      setImportingFixture(true);
      const fixture = await importFixtureByCode(fmsFixtureCode);
      applyImportedFixture(fixture);
      showSuccess("Fixture imported", "The fixture details have been filled from FMS.");
    } catch (error) {
      console.error(error);
      showError("Could not import fixture", getCmsErrorMessage(error));
    } finally {
      setImportingFixture(false);
    }
  }

  function resetSaveAndNextFields() {
    setFmsFixtureCode("");
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setHomeTeam("");
    setAwayTeam("");
    setAgeGroup("");
    setCity("");
    setCountry("Zimbabwe");
    setDescription("");
    setVerticalCard("");
    setStreamUrl("");
    setVodUrl("");
    setThumbnail("");
  }

  async function saveEvent(action: "save" | "saveAndNext") {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      showWarning("Teams required", "Please add both Team A and Team B.");
      return;
    }

    if (!date || !startTime) {
      showWarning("Date and start time required", "Please add the match date and start time.");
      return;
    }

    try {
      setSubmitting(true);

      await createCmsEvent({
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

      if (action === "saveAndNext") {
        resetSaveAndNextFields();
        showSuccess("Fixture saved", "Ready for the next fixture.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      showSuccess("Fixture created", "Redirecting to events list.");
      router.push("/events");
    } catch (error) {
      console.error(error);
      showError("Could not create fixture", getCmsErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveEvent("save");
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
        <Link href="/events" className="text-lg font-semibold text-cyan-600">
          Back to events list
        </Link>

        <h1 className="mt-3 text-center text-4xl font-extrabold text-[#141248]">
          Add Fixture
        </h1>

        <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-7xl space-y-8">
          <Fieldset title="Fixture Details">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4">
                <TextField label="FMS Fixture Code" value={fmsFixtureCode} onChange={setFmsFixtureCode} placeholder="RUGTHSWSO040726075A" />
              </div>
              <div className="col-span-12 md:col-span-4 flex items-end">
                <button
                  type="button"
                  onClick={handleImportFixture}
                  disabled={importingFixture || submitting}
                  className="h-11 w-full bg-cyan-500 px-4 text-sm font-extrabold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importingFixture ? "Importing..." : "Import Fixture from FMS"}
                </button>
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
                <TeamNameField label="Team A" value={homeTeam} onChange={setHomeTeam} teams={teams} datalistId="create-home-team-options" placeholder={teamsLoading ? "Loading teams..." : "Heritage"} required />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TeamNameField label="Team B" value={awayTeam} onChange={setAwayTeam} teams={teams} datalistId="create-away-team-options" placeholder={teamsLoading ? "Loading teams..." : "Wise Owl"} required />
              </div>
              <div className="col-span-6 md:col-span-2">
                <TextField label="Age Group" value={ageGroup} onChange={setAgeGroup} placeholder="2nds Vs 1st" />
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
                <TextAreaField label="Technition(s)" value={technicians} onChange={setTechnicians} placeholder="Cilani Dube" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <TextAreaField label="Comentator(s)" value={commentators} onChange={setCommentators} placeholder="Darlington Matambanadzo\nTariro Chawafambra" />
              </div>

              <div className="col-span-12 md:col-span-4">
                <TextField label="Stiching By" value={stitchingBy} onChange={setStitchingBy} placeholder="Dimitri Passade" />
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
                  label="Upload Horizontal Card / Thumbnail - Preset 1600x500"
                  value={thumbnail}
                  onUploaded={setThumbnail}
                />
                <CardPreview
                  title="Horizontal Card / Thumbnail"
                  subtitle="Uploads are compressed. Preset: Ad banner 1600x500. Target max size: about 400 KB."
                  imageUrl={thumbnail}
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
                  label="Upload Vertical Card - Preset 500x1600"
                  value={verticalCard}
                  onUploaded={setVerticalCard}
                />
                <CardPreview
                  title="Vertical Card"
                  subtitle="Uploads are compressed. Preset: Ad banner 500x1600. Target max size: about 400 KB."
                  imageUrl={verticalCard}
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

          <div className="flex flex-wrap justify-end gap-4 pb-20">
            <button type="button" onClick={() => router.back()} className="border border-slate-300 bg-white px-10 py-4 text-base font-extrabold text-[#29496d]">
              Cancel
            </button>
            <button type="button" disabled={submitting} onClick={() => saveEvent("saveAndNext")} className="border border-cyan-500 bg-white px-10 py-4 text-base font-extrabold text-cyan-600 hover:bg-cyan-50 disabled:opacity-50">
              {submitting ? "Saving..." : "Save and Next"}
            </button>
            <button type="submit" disabled={submitting} className="bg-cyan-500 px-10 py-4 text-base font-extrabold text-white hover:bg-cyan-600 disabled:opacity-50">
              {submitting ? "Creating..." : "Add Fixture"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
