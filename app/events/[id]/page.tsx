"use client";
import { databases, storage, account } from "@/lib/appwrite";
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
import { useEffect, useState } from "react";

function toDatetimeLocal(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const eventId = params.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const [isFeatured, setIsFeatured] = useState(false);

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

        setTitle(event.title || "");
        setSport(event.sport || "");
        setVenue(event.venue || "");
        setCompetition(event.competition || "");
        setClub(event.competition || "");
        setStatus((event.status || "upcoming") as EventStatus);
        setVodType((event.vodType || "video") as VodType);
        setMatchDate(toDatetimeLocal(event.matchDate));
        setHomeTeam(event.homeTeam || "");
        setAwayTeam(event.awayTeam || "");
        setStreamUrl(event.streamUrl || "");
        setVodUrl(event.vodUrl || "");
        setCamera(event.camera || "");
        setThumbnail(event.thumbnail || "");
        setFixturesId(event.fixturesId || "");
        setDescription(event.description || "");
        setIsFeatured(Boolean(event.isFeatured));
      } catch (error) {
        console.error(error);
        alert("Could not load event.");
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!homeTeam.trim() || !awayTeam.trim()) {
      alert("Please add both home team and guest team.");
      return;
    }

    if (!matchDate) {
      alert("Please add a start date and time.");
      return;
    }

    try {
      setSubmitting(true);

      await updateCmsEvent(eventId, {
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

      router.push("/events");
    } catch (error) {
      console.error(error);
      alert("Could not update event. Check your Appwrite fields and permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event and all linked fixtures? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);

      await deleteCmsEventAndFixture(eventId, fixturesId);

      router.push("/events");
    } catch (error) {
      console.error(error);
      alert(
        "Could not delete event and linked fixtures. Check your Appwrite permissions."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <CmsAuthGuard>
        <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
          <div className="mx-auto max-w-7xl">
            <Link href="/events" className="text-2xl font-medium text-cyan-600">
              Back to events list
            </Link>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
              <p className="text-xl font-semibold text-slate-500">
                Loading event...
              </p>
            </div>
          </div>
        </main>
      </CmsAuthGuard>
    );
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
        <Link href="/events" className="text-2xl font-medium text-cyan-600">
          Back to events list
        </Link>

        <h1 className="mt-4 text-center text-5xl font-bold">Edit Event</h1>

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
                  placeholder="Club / Competition"
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
                <SelectField
                  value={competition}
                  onChange={setCompetition}
                  options={[
                    { label: "Game Type", value: "" },
                    { label: "Derby Day", value: "Derby Day" },
                    { label: "League", value: "League" },
                    { label: "Cup", value: "Cup" },
                    { label: "Friendly", value: "Friendly" },
                    { label: "Tournament", value: "Tournament" },
                  ]}
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
                  datalistId="edit-home-team-options"
                />
              </div>

              <div className="col-span-6">
                <TeamNameField
                  value={awayTeam}
                  onChange={setAwayTeam}
                  placeholder="Guest Team"
                  teams={teams}
                  datalistId="edit-away-team-options"
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

              <div className="col-span-12 rounded border border-red-200 bg-red-50 p-4 text-red-700">
                <p className="font-bold">Delete behaviour</p>

                <p className="mt-1 text-sm">
                  Deleting this event will delete the stream document and will
                  also try to delete linked fixtures in the fixtures table using
                  both:
                </p>

                <ul className="mt-2 list-disc pl-6 text-sm">
                  <li>
                    <span className="font-bold">streams.fixturesId</span>
                    {fixturesId.trim() ? `: ${fixturesId.trim()}` : ": empty"}
                  </li>
                  <li>
                    <span className="font-bold">fixtures.streamId</span>
                    {`: ${eventId}`}
                  </li>
                </ul>
              </div>
            </div>
          </Fieldset>

          <div className="flex justify-between gap-4 pb-20">
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="border border-red-300 bg-white px-12 py-4 text-xl font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {submitting ? "Working..." : "Delete Event"}
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting}
                className="border border-slate-300 bg-white px-12 py-4 text-xl font-bold text-[#29496d] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-cyan-500 px-12 py-4 text-xl font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
