"use client";
import { databases, storage, account } from "@/lib/appwrite";
import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import {
  CmsTeam,
  EventStatus,
  VodType,
  createCmsEvent,
  getCmsTeams,
} from "@/lib/cms";
import Link from "next/link";
import { getCmsErrorMessage, useCmsToast } from "@/components/cms-toast-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-semibold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />
    </label>
  );
}


function DatalistTextField({
  label,
  value,
  onChange,
  placeholder,
  datalistId,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  datalistId: string;
  options: string[];
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-semibold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

      <input
        type="text"
        list={datalistId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />

      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
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
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  teams: CmsTeam[];
  datalistId: string;
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-semibold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

      <input
        type="text"
        list={datalistId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />

      <datalist id={datalistId}>
        {teams.map((team) => (
          <option key={team.$id} value={team.name || ""} />
        ))}
      </datalist>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-semibold text-[#8ba0b6]">
          {label}
        </span>
      ) : null}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none focus:border-cyan-500"
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

function Fieldset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="relative border border-slate-300 px-7 pb-7 pt-8">
      <legend className="px-3 text-2xl font-semibold text-[#8ba0b6]">
        {title}
      </legend>

      {children}
    </fieldset>
  );
}


const GAME_TYPE_OPTIONS = [
  "Derby Day",
  "League",
  "Cup",
  "Friendly",
  "Tournament",
];

export default function CreateEventPage() {
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [title, setTitle] = useState("");

  const [club, setClub] = useState("");
  const [sport, setSport] = useState("");
  const [venue, setVenue] = useState("");
  const [competition, setCompetition] = useState("");
  const [status, setStatus] = useState<EventStatus>("upcoming");
  const [vodType, setVodType] = useState<VodType>("video");

  const [matchDate, setMatchDate] = useState("");

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");

  const [streamUrl, setStreamUrl] = useState("");
  const [vodUrl, setVodUrl] = useState("");
  const [camera, setCamera] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [fixturesId, setFixturesId] = useState("");
  const [description, setDescription] = useState("");

  const [isFeatured, setIsFeatured] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

  function resetSaveAndNextFields() {
    setTitle("");
    setHomeTeam("");
    setAwayTeam("");
    setMatchDate("");
    setThumbnail("");
    setStreamUrl("");
    setVodUrl("");
    setFixturesId("");
  }

  async function saveEvent(action: "save" | "saveAndNext") {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      showWarning("Teams required", "Please add both home team and guest team.");
      return;
    }

    if (!matchDate) {
      showWarning("Start date required", "Please add a start date and time.");
      return;
    }

    try {
      setSubmitting(true);

      await createCmsEvent({
        title: title.trim(),
        status,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        matchDate,
        venue: venue.trim(),
        thumbnail: thumbnail.trim(),
        streamUrl: streamUrl.trim(),
        vodUrl: vodUrl.trim(),
        description: description.trim(),
        competition: competition.trim() || club.trim(),
        isFeatured,
        camera: camera.trim(),
        sport: sport.trim(),
        vodType,
        fixturesId: fixturesId.trim(),
      });

      if (action === "saveAndNext") {
        resetSaveAndNextFields();
        showSuccess("Event saved", "Ready for the next event.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      showSuccess("Event created", "Redirecting to events list.");
      router.push("/events");
    } catch (error) {
      console.error(error);
      showError("Could not create event", getCmsErrorMessage(error));
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
        <Link href="/events" className="text-2xl font-medium text-cyan-600">
          Back to events list
        </Link>

        <h1 className="mt-4 text-center text-5xl font-bold">Create Event</h1>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-20 max-w-7xl space-y-8"
        >
          <Fieldset title="General">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-9">
                <TextField value={title} onChange={setTitle} placeholder="Name" />
              </div>

                            <label className="col-span-12 md:col-span-6">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Camera
                </span>

                <input
                  value={camera}
                  onChange={(event) => setCamera(event.target.value)}
                  placeholder="Camera 1, Main camera, Pitch camera..."
                  className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                />
              </label>


              <div className="col-span-6">
                <TextField
                  value={club}
                  onChange={setClub}
                  placeholder="Club / Community"
                />
              </div>

              <div className="col-span-6">
                <SelectField
                  value={sport}
                  onChange={setSport}
                  options={[
                    { label: "Sport Type", value: "" },
                    { label: "Rugby", value: "Rugby" },
                    { label: "Football", value: "Football" },
                    { label: "Hockey", value: "Hockey" },
                    { label: "Cricket", value: "Cricket" },
                    { label: "Basketball", value: "Basketball" },
                    { label: "Netball", value: "Netball" },
                  ]}
                />
              </div>

              <div className="col-span-6">
                <TextField value={venue} onChange={setVenue} placeholder="Venue" />
              </div>

              <div className="col-span-6">
                <SelectField
                  label="Production / VOD Type"
                  value={vodType}
                  onChange={(value) => setVodType(value as VodType)}
                  options={[
                    { label: "Auto Camera / Video", value: "video" },
                    { label: "YouTube", value: "youtube" },
                  ]}
                />
              </div>

              <div className="col-span-6">
                <DatalistTextField
                  label="Game Type"
                  value={competition}
                  onChange={setCompetition}
                  placeholder="Type or choose game type"
                  datalistId="create-game-type-options"
                  options={GAME_TYPE_OPTIONS}
                />
              </div>

              <div className="col-span-6">
                <SelectField
                  value={status}
                  onChange={(value) => setStatus(value as EventStatus)}
                  options={[
                    { label: "Upcoming", value: "upcoming" },
                    { label: "Live", value: "live" },
                    { label: "Waiting", value: "waiting" },
                    { label: "Completed", value: "completed" },
                    { label: "VOD", value: "vod" },
                    { label: "Cancelled", value: "cancelled" },
                    { label: "Hidden", value: "hidden" },
                  ]}
                />
              </div>

              <div className="col-span-6">
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  value={matchDate}
                  onChange={setMatchDate}
                  placeholder="Start Date"
                />
              </div>
            </div>
          </Fieldset>

          <Fieldset title={`Teams${teamsLoading ? " - loading team names..." : ""}`}>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-6">
                <TeamNameField
                  value={homeTeam}
                  onChange={setHomeTeam}
                  placeholder="Home Team"
                  teams={teams}
                  datalistId="create-home-team-options"
                />
              </div>

              <div className="col-span-6">
                <TeamNameField
                  value={awayTeam}
                  onChange={setAwayTeam}
                  placeholder="Guest Team"
                  teams={teams}
                  datalistId="create-away-team-options"
                />
              </div>
            </div>
          </Fieldset>

          <Fieldset title="Stream Details">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-6">
                <TextField
                  value={streamUrl}
                  onChange={setStreamUrl}
                  placeholder="Live Stream URL"
                />
              </div>

              <div className="col-span-6">
                <TextField value={vodUrl} onChange={setVodUrl} placeholder="VOD URL" />
              </div>

              <div className="col-span-6">
                <TextField
                  value={thumbnail}
                  onChange={setThumbnail}
                  placeholder="Thumbnail URL"
                />
              </div>

              <div className="col-span-12">
                <CmsImageUpload
                  label="Upload Event Thumbnail"
                  value={thumbnail}
                  onUploaded={setThumbnail}
                />
              </div>

              <div className="col-span-6">
                <TextField
                  value={fixturesId}
                  onChange={setFixturesId}
                  placeholder="Optional linked fixture ID"
                />
              </div>

              <div className="col-span-12">
                <TextField
                  value={description}
                  onChange={setDescription}
                  placeholder="Description"
                />
              </div>

              <label className="col-span-12 flex items-center gap-4 text-xl font-medium">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(event) => setIsFeatured(event.target.checked)}
                  className="h-6 w-6"
                />
                Featured event
              </label>

            </div>
          </Fieldset>

          <div className="flex flex-wrap justify-end gap-4 pb-20">
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-slate-300 bg-white px-12 py-4 text-xl font-bold text-[#29496d]"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => saveEvent("saveAndNext")}
              className="border border-cyan-500 bg-white px-12 py-4 text-xl font-bold text-cyan-600 hover:bg-cyan-50 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save and Next"}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-cyan-500 px-12 py-4 text-xl font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
