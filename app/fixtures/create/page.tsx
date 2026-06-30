"use client";
import { databases, storage, account } from "@/lib/appwrite";
import CmsAuthGuard from "@/components/cms-auth-guard";
import {
  getCmsErrorMessage,
  useCmsToast,
} from "@/components/cms-toast-provider";
import {
  CmsTeam,
  createCmsFixture,
  FixtureStatus,
  getCmsTeams,
} from "@/lib/cms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const initialForm = {
  homeTeam: "",
  awayTeam: "",
  sport: "",
  communityName: "",
  competition: "",
  venue: "",
  matchDate: "",
  status: "upcoming" as FixtureStatus,
  homeScore: "0",
  awayScore: "0",
  isStreamed: false,
  streamId: "",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        required={required}
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function TeamNameField({
  label,
  value,
  onChange,
  teams,
  datalistId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  teams: CmsTeam[];
  datalistId: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={datalistId}
        placeholder="Start typing a team name..."
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      />

      <datalist id={datalistId}>
        {teams.map((team) => (
          <option key={team.$id} value={team.name || ""} />
        ))}
      </datalist>
    </label>
  );
}

export default function CreateFixturePage() {
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    async function loadTeams() {
      try {
        setTeamsLoading(true);
        const data = await getCmsTeams();
        setTeams(data);
      } catch (error) {
        console.error("Teams load error:", error);
        showError("Could not load teams", getCmsErrorMessage(error));
      } finally {
        setTeamsLoading(false);
      }
    }

    loadTeams();
  }, [showError]);

  function updateField(key: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFixtureForm() {
    setForm(initialForm);
  }

  async function saveFixture(action: "create" | "saveAndNext") {
    if (!form.homeTeam.trim() || !form.awayTeam.trim()) {
      showWarning("Teams required", "Home Team and Away Team are required.");
      return;
    }

    if (!form.matchDate) {
      showWarning("Match date required", "Please add the fixture date and time.");
      return;
    }

    try {
      setSaving(true);

      await createCmsFixture(form);

      if (action === "saveAndNext") {
        resetFixtureForm();
        showSuccess("Fixture saved", "Ready for the next fixture.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      showSuccess("Fixture created", "Redirecting to fixtures list.");
      router.push("/fixtures");
    } catch (error) {
      console.error("Create fixture error:", error);
      showError("Could not create fixture", getCmsErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveFixture("create");
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/fixtures"
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Fixtures
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Create Fixture</h1>

              <p className="mt-2 text-slate-500">
                Use Save and Next to keep adding fixtures without leaving this page.
              </p>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-5xl gap-6 px-8 py-10"
        >
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">
              Fixture Details
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {teamsLoading
                ? "Loading team names..."
                : "Team fields use your Teams CMS names."}
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <TeamNameField
                label="Home Team"
                value={form.homeTeam}
                onChange={(value) => updateField("homeTeam", value)}
                teams={teams}
                datalistId="fixture-create-home-team-options"
              />

              <TeamNameField
                label="Away Team"
                value={form.awayTeam}
                onChange={(value) => updateField("awayTeam", value)}
                teams={teams}
                datalistId="fixture-create-away-team-options"
              />

              <Field
                label="Sport"
                value={form.sport}
                onChange={(value) => updateField("sport", value)}
                placeholder="Football, Basketball, Soccer..."
              />

              <Field
                label="Community Name"
                value={form.communityName}
                onChange={(value) => updateField("communityName", value)}
                placeholder="Community"
              />

              <Field
                label="Competition"
                value={form.competition}
                onChange={(value) => updateField("competition", value)}
                placeholder="League / Tournament"
              />

              <Field
                label="Venue"
                value={form.venue}
                onChange={(value) => updateField("venue", value)}
                placeholder="Venue"
              />

              <Field
                label="Match Date"
                value={form.matchDate}
                onChange={(value) => updateField("matchDate", value)}
                type="datetime-local"
                required
              />

              <label className="block">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value as FixtureStatus)
                  }
                  className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>

              <Field
                label="Home Score"
                value={form.homeScore}
                onChange={(value) => updateField("homeScore", value)}
                type="number"
              />

              <Field
                label="Away Score"
                value={form.awayScore}
                onChange={(value) => updateField("awayScore", value)}
                type="number"
              />

              <Field
                label="Stream ID"
                value={form.streamId}
                onChange={(value) => updateField("streamId", value)}
                placeholder="Optional streams document ID"
              />
            </div>

            <label className="mt-6 flex items-center gap-3">
              <input
                checked={form.isStreamed}
                onChange={(event) =>
                  updateField("isStreamed", event.target.checked)
                }
                type="checkbox"
                className="h-5 w-5"
              />

              <span className="font-bold text-[#29496d]">
                This fixture is streamed
              </span>
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/fixtures"
              className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d] transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={saving}
              onClick={() => saveFixture("saveAndNext")}
              className="rounded border border-cyan-200 bg-white px-7 py-4 text-lg font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save and Next"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Fixture"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
