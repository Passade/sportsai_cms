"use client";
import { databases, storage, account } from "@/lib/appwrite";
import CmsAuthGuard from "@/components/cms-auth-guard";
import {
  calculatePredictionPoints,
  CmsFixture,
  CmsPrediction,
  CmsTeam,
  deleteCmsFixture,
  FixtureStatus,
  getCmsFixtureById,
  getCmsPredictionsForFixture,
  getCmsTeams,
  normalizeDateTimeForInput,
  scoreCmsPredictionsForFixture,
  updateCmsFixture,
  updateCmsFixtureStatus,
} from "@/lib/cms";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

export default function EditFixturePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [fixture, setFixture] = useState<CmsFixture | null>(null);
  const [predictions, setPredictions] = useState<CmsPrediction[]>([]);
  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [fixtureDoc, predictionList, teamList] = await Promise.all([
        getCmsFixtureById(params.id),
        getCmsPredictionsForFixture(params.id),
        getCmsTeams(),
      ]);

      const normalizedFixture: CmsFixture = {
        $id: fixtureDoc.$id,
        homeTeam: String(fixtureDoc.homeTeam || ""),
        awayTeam: String(fixtureDoc.awayTeam || ""),
        sport: String(fixtureDoc.sport || ""),
        communityName: String(fixtureDoc.communityName || ""),
        competition: String(fixtureDoc.competition || ""),
        venue: String(fixtureDoc.venue || ""),
        matchDate: String(fixtureDoc.matchDate || ""),
        status: String(fixtureDoc.status || "upcoming"),
        homeScore: Number(fixtureDoc.homeScore ?? 0),
        awayScore: Number(fixtureDoc.awayScore ?? 0),
        isStreamed: Boolean(fixtureDoc.isStreamed),
        streamId: String(fixtureDoc.streamId || ""),
        searchText: String(fixtureDoc.searchText || ""),
      };

      setFixture(normalizedFixture);
      setPredictions(predictionList);
      setTeams(teamList);

      setForm({
        homeTeam: normalizedFixture.homeTeam || "",
        awayTeam: normalizedFixture.awayTeam || "",
        sport: normalizedFixture.sport || "",
        communityName: normalizedFixture.communityName || "",
        competition: normalizedFixture.competition || "",
        venue: normalizedFixture.venue || "",
        matchDate: normalizeDateTimeForInput(normalizedFixture.matchDate || ""),
        status: (normalizedFixture.status || "upcoming") as FixtureStatus,
        homeScore: String(normalizedFixture.homeScore ?? 0),
        awayScore: String(normalizedFixture.awayScore ?? 0),
        isStreamed: Boolean(normalizedFixture.isStreamed),
        streamId: normalizedFixture.streamId || "",
      });
    } catch (error: any) {
      console.error("Load fixture error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load fixture."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  function updateField(key: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const scoringPreview = useMemo(() => {
    if (!fixture) {
      return [];
    }

    const previewFixture: CmsFixture = {
      ...fixture,
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
      homeScore: Number.parseInt(form.homeScore || "0", 10) || 0,
      awayScore: Number.parseInt(form.awayScore || "0", 10) || 0,
    };

    return predictions.map((prediction) => ({
      prediction,
      result: calculatePredictionPoints(previewFixture, prediction),
    }));
  }, [fixture, predictions, form.homeTeam, form.awayTeam, form.homeScore, form.awayScore]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.homeTeam.trim() || !form.awayTeam.trim()) {
      alert("Home Team and Away Team are required.");
      return;
    }

    try {
      setSaving(true);
      await updateCmsFixture(params.id, form);
      await loadData();
      alert("Fixture saved.");
    } catch (error: any) {
      console.error("Update fixture error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not update fixture."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: FixtureStatus) {
    try {
      setStatusSaving(true);
      await updateCmsFixtureStatus(params.id, status);
      await loadData();
    } catch (error: any) {
      console.error("Update fixture status error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not update fixture status."
      );
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleScorePredictions() {
    const confirmed = window.confirm(
      "Score all predictions for this fixture using the current final score? This will set the fixture status to result and predictionStatus to scored."
    );

    if (!confirmed) {
      return;
    }

    try {
      setScoring(true);

      await updateCmsFixture(params.id, {
        ...form,
        status: "result",
      });

      const result = await scoreCmsPredictionsForFixture(params.id);

      await loadData();

      alert(
        `Scored ${result.totalScored} predictions. Actual winner: ${result.actualWinner}.`
      );
    } catch (error: any) {
      console.error("Score predictions error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not score predictions."
      );
    } finally {
      setScoring(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this fixture? Existing predictions for this fixture will not be deleted automatically."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      await deleteCmsFixture(params.id);
      router.push("/fixtures");
    } catch (error: any) {
      console.error("Delete fixture error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not delete fixture."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <CmsAuthGuard>
        <main className="min-h-screen bg-[#f8fafc] px-8 py-10 text-[#29496d]">
          Loading fixture...
        </main>
      </CmsAuthGuard>
    );
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/fixtures"
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Fixtures
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Edit Fixture</h1>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded border border-red-200 bg-white px-5 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete Fixture"}
            </button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-8 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Quick Status</h2>

            <div className="mt-5 flex flex-wrap gap-3">
              {([
                "upcoming",
                "live",
                "result",
                "completed",
                "cancelled",
                "hidden",
              ] as FixtureStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    disabled={statusSaving}
                    className={`rounded px-5 py-3 font-bold capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      form.status === status
                        ? "bg-cyan-500 text-white"
                        : "border border-slate-200 bg-white text-[#29496d] hover:bg-slate-50"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#29496d]">
                Fixture Details
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <TeamNameField
                  label="Home Team"
                  value={form.homeTeam}
                  onChange={(value) => updateField("homeTeam", value)}
                  teams={teams}
                  datalistId="fixture-edit-home-team-options"
                />

                <TeamNameField
                  label="Away Team"
                  value={form.awayTeam}
                  onChange={(value) => updateField("awayTeam", value)}
                  teams={teams}
                  datalistId="fixture-edit-away-team-options"
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
                    <option value="result">Result</option>
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

            <div className="flex justify-end gap-3">
              <Link
                href="/fixtures"
                className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d] transition hover:bg-slate-50"
              >
                Back
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Fixture"}
              </button>
            </div>
          </form>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#29496d]">
                  Predictions
                </h2>

                <p className="mt-2 text-slate-500">
                  {predictions.length} predictions for this fixture. Scoring gives 3
                  points for correct winner and 2 bonus points for exact score.
                </p>
              </div>

              <button
                type="button"
                onClick={handleScorePredictions}
                disabled={scoring}
                className="rounded bg-green-600 px-7 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scoring ? "Scoring..." : "Score Predictions"}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              {predictions.length === 0 ? (
                <div className="rounded border border-slate-200 p-5 text-slate-500">
                  No predictions yet for this fixture.
                </div>
              ) : (
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-400">
                      <th className="py-3 pr-4">User</th>
                      <th className="py-3 pr-4">Winner</th>
                      <th className="py-3 pr-4">Score</th>
                      <th className="py-3 pr-4">Current Points</th>
                      <th className="py-3 pr-4">Preview Points</th>
                      <th className="py-3 pr-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {scoringPreview.map(({ prediction, result }) => (
                      <tr
                        key={prediction.$id}
                        className="border-b border-slate-100 text-sm"
                      >
                        <td className="py-4 pr-4 font-semibold text-[#29496d]">
                          {prediction.userName || prediction.userId || "Unknown"}
                        </td>

                        <td className="py-4 pr-4 text-slate-600">
                          {prediction.predictedWinner || "-"}
                        </td>

                        <td className="py-4 pr-4 text-slate-600">
                          {prediction.predictedHomeScore ?? 0} -{" "}
                          {prediction.predictedAwayScore ?? 0}
                        </td>

                        <td className="py-4 pr-4 text-slate-600">
                          {prediction.pointsAwarded ?? 0}
                        </td>

                        <td className="py-4 pr-4 font-bold text-[#29496d]">
                          {result.points}
                          <span className="ml-2 text-xs font-semibold text-slate-400">
                            {result.exactScore
                              ? "Exact score"
                              : result.winnerCorrect
                              ? "Winner"
                              : "No points"}
                          </span>
                        </td>

                        <td className="py-4 pr-4 text-slate-600">
                          {prediction.predictionStatus || "pending"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}