import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  RefreshCw,
  Mic,
  PlayCircle,
  Clock,
  Users,
  Star,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import GoldenBadge from "../../GoldenBadge";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export interface OralCandidate {
  id: string;

  fullName: string;
  email: string;
  position: string;
  location: string;

  presentationScore: number;

  communication: number;
  confidence: number;
  clarity: number;

  duration: number;

  videoUrl?: string;

  aiScore?: number;

  createdAt: string;
}

interface OralPresentationResultsProps {
  candidates: OralCandidate[];

  recruiterPlan: "free" | "paid" | "corporate";

  loading?: boolean;

  onRefresh?: () => void;

  onViewPresentation?: (
    candidate: OralCandidate
  ) => void;
}

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const SCORE_FILTERS = [
  "All",
  "90+",
  "80-89",
  "70-79",
  "60-69",
  "<60",
];

const SORT_OPTIONS = [
  {
    id: "score",
    label: "Presentation Score",
  },
  {
    id: "duration",
    label: "Shortest",
  },
  {
    id: "recent",
    label: "Newest",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const OralPresentationResults: React.FC<
  OralPresentationResultsProps
> = ({
  candidates,
  recruiterPlan,
  loading = false,
  onRefresh,
  onViewPresentation,
}) => {

  /* ---------------------------------------------------------------------- */
  /*                                  STATE                                 */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("All");

  const [scoreFilter, setScoreFilter] =
    useState("All");

  const [sortBy, setSortBy] =
    useState("score");

  const [currentPage, setCurrentPage] =
    useState(1);

  const PAGE_SIZE = 10;

  /* ---------------------------------------------------------------------- */
  /*                              FILTER VALUES                              */
  /* ---------------------------------------------------------------------- */

  const locations = useMemo(() => {

    const values = Array.from(
      new Set(
        candidates.map(
          (candidate) =>
            candidate.location
        )
      )
    );

    return [
      "All",
      ...values,
    ];

  }, [candidates]);

  /* ---------------------------------------------------------------------- */
  /*                                FILTERING                                */
  /* ---------------------------------------------------------------------- */

  const filteredCandidates =
    useMemo(() => {

      let data = [...candidates];

      /* Search */

      if (search.trim()) {

        const keyword =
          search.toLowerCase();

        data = data.filter(
          (candidate) =>
            candidate.fullName
              .toLowerCase()
              .includes(keyword) ||
            candidate.email
              .toLowerCase()
              .includes(keyword) ||
            candidate.position
              .toLowerCase()
              .includes(keyword)
        );

      }

      /* Location */

      if (
        locationFilter !== "All"
      ) {

        data = data.filter(
          (candidate) =>
            candidate.location ===
            locationFilter
        );

      }

      /* Score */

      if (
        scoreFilter !== "All"
      ) {

        data = data.filter(
          (candidate) => {

            const score =
              candidate.presentationScore;

            switch (
              scoreFilter
            ) {

              case "90+":
                return score >= 90;

              case "80-89":
                return (
                  score >= 80 &&
                  score < 90
                );

              case "70-79":
                return (
                  score >= 70 &&
                  score < 80
                );

              case "60-69":
                return (
                  score >= 60 &&
                  score < 70
                );

              case "<60":
                return score < 60;

              default:
                return true;

            }

          }
        );

      }

      /* Sorting */

      switch (sortBy) {

        case "duration":

          data.sort(
            (a, b) =>
              a.duration -
              b.duration
          );

          break;

        case "recent":

          data.sort(
            (a, b) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          );

          break;

        default:

          data.sort(
            (a, b) =>
              b.presentationScore -
              a.presentationScore
          );

      }

      return data;

    }, [
      candidates,
      search,
      locationFilter,
      scoreFilter,
      sortBy,
    ]);

  /* ---------------------------------------------------------------------- */
  /*                               PAGINATION                                */
  /* ---------------------------------------------------------------------- */

  const totalPages =
    Math.ceil(
      filteredCandidates.length /
      PAGE_SIZE
    );

  const paginatedCandidates =
    filteredCandidates.slice(
      (currentPage - 1) *
        PAGE_SIZE,
      currentPage *
        PAGE_SIZE
    );

  /* ---------------------------------------------------------------------- */
  /*                                 STATS                                   */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {

    const average =
      candidates.length === 0
        ? 0
        : Math.round(
            candidates.reduce(
              (
                total,
                candidate
              ) =>
                total +
                candidate.presentationScore,
              0
            ) /
              candidates.length
          );

    return {

      candidates:
        candidates.length,

      average,

      excellent:
        candidates.filter(
          (candidate) =>
            candidate.presentationScore >=
            90
        ).length,

      completed:
        candidates.filter(
          (candidate) =>
            candidate.videoUrl
        ).length,

    };

  }, [candidates]);

  /* ---------------------------------------------------------------------- */
  /*                                    UI                                   */
  /* ---------------------------------------------------------------------- */

  return (

    <div className="space-y-8">

      {/* =============================================================== */}
      {/* HEADER                                                          */}
      {/* =============================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

        <div>

          <div className="flex items-center gap-3">

            <Mic className="text-indigo-600" />

            <h1 className="text-3xl font-black text-slate-900">

              Oral Presentation Results

            </h1>

            {recruiterPlan ===
              "corporate" && (
              <GoldenBadge />
            )}

          </div>

          <p className="mt-2 text-slate-500">

            Review candidates'
            oral presentations,
            communication skills
            and confidence.

          </p>

        </div>

        <button

          onClick={onRefresh}

          className="flex items-center gap-2 rounded-xl border px-5 py-3 hover:bg-slate-50 transition"

        >

          <RefreshCw size={18} />

          Refresh

        </button>

      </div>

      {/* =============================================================== */}
      {/* STATISTICS                                                      */}
      {/* =============================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

        <StatCard
          title="Candidates"
          value={stats.candidates}
          icon={<Users size={20} />}
        />

        <StatCard
          title="Average Score"
          value={`${stats.average}%`}
          icon={<Star size={20} />}
        />

        <StatCard
          title="Excellent"
          value={stats.excellent}
          icon={<Sparkles size={20} />}
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={20} />}
        />

      </div>

      {/* =============================================================== */}
      {/* SEARCH & FILTERS                                                */}
      {/* =============================================================== */}

      <div className="rounded-3xl border bg-white p-6">

        <div className="grid lg:grid-cols-4 gap-4">

          {/* Search */}

          <div className="relative">

            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search candidate..."
              className="w-full rounded-xl border pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Score */}

          <select
            value={scoreFilter}
            onChange={(e) =>
              setScoreFilter(
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            {SCORE_FILTERS.map(
              (score) => (
                <option
                  key={score}
                  value={score}
                >
                  {score}
                </option>
              )
            )}
          </select>

          {/* Location */}

          <select
            value={locationFilter}
            onChange={(e) =>
              setLocationFilter(
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            {locations.map(
              (
                location
              ) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              )
            )}
          </select>

          {/* Sort */}

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            {SORT_OPTIONS.map(
              (
                option
              ) => (
                <option
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

        </div>

      </div>

      {/* =============================================================== */}
      {/* LOADING / EMPTY STATE                                           */}
      {/* =============================================================== */}

      {loading ? (

        <div className="rounded-3xl border bg-white p-20 flex items-center justify-center">

          <div className="flex flex-col items-center gap-5">

            <RefreshCw
              size={42}
              className="animate-spin text-indigo-600"
            />

            <p className="font-semibold text-slate-500">

              Loading presentations...

            </p>

          </div>

        </div>

      ) : filteredCandidates.length === 0 ? (

        <div className="rounded-3xl border bg-white p-20 text-center">

          <Mic
            size={60}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-6 text-2xl font-black">

            No Presentations Found

          </h2>

          <p className="mt-2 text-slate-500">

            Try changing your filters.

          </p>

        </div>

      ) : (

        <>

          {/* =========================================================== */}
          {/* DESKTOP TABLE                                               */}
          {/* =========================================================== */}

          <div className="hidden xl:block overflow-hidden rounded-3xl border bg-white">

            <table className="w-full">

              <thead className="bg-slate-50">

                <tr>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Candidate

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Position

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Presentation Score

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Communication

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Confidence

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Duration

                  </th>

                  <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-widest">

                    Action

                  </th>

                </tr>

              </thead>

              <tbody>

                {paginatedCandidates.map((candidate) => (

                  <motion.tr

                    key={candidate.id}

                    initial={{
                      opacity: 0,
                      y: 20,
                    }}

                    animate={{
                      opacity: 1,
                      y: 0,
                    }}

                    className="border-t hover:bg-slate-50 transition"

                  >

                    {/* Candidate */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-700">

                          {candidate.fullName
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)}

                        </div>

                        <div>

                          <p className="font-bold text-slate-900">

                            {candidate.fullName}

                          </p>

                          <p className="text-sm text-slate-500">

                            {candidate.email}

                          </p>

                        </div>

                      </div>

                    </td>

                    {/* Position */}

                    <td className="px-6 py-5">

                      {candidate.position}

                    </td>

                    {/* Presentation Score */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">

                          <div
                            className={`h-full rounded-full ${
                              candidate.presentationScore >= 90
                                ? "bg-green-500"
                                : candidate.presentationScore >= 70
                                ? "bg-blue-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${candidate.presentationScore}%`,
                            }}
                          />

                        </div>

                        <span className="font-bold">

                          {candidate.presentationScore}%

                        </span>

                      </div>

                    </td>

                    {/* Communication */}

                    <td className="px-6 py-5">

                      {candidate.communication}%

                    </td>

                    {/* Confidence */}

                    <td className="px-6 py-5">

                      {candidate.confidence}%

                    </td>

                    {/* Duration */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-2">

                        <Clock size={16} />

                        {candidate.duration} min

                      </div>

                    </td>

                    {/* Action */}

                    <td className="px-6 py-5">

                      <div className="flex justify-end">

                        <button

                          onClick={() =>
                            onViewPresentation?.(
                              candidate
                            )
                          }

                          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white transition hover:bg-indigo-700"

                        >

                          <PlayCircle size={18} />

                          Watch

                        </button>

                      </div>

                    </td>

                  </motion.tr>

                ))}

              </tbody>

            </table>

          </div>

          {/* =========================================================== */}
          {/* MOBILE CARDS                                                */}
          {/* =========================================================== */}

          <div className="grid gap-5 xl:hidden">

            {paginatedCandidates.map((candidate) => (

              <motion.div

                key={candidate.id}

                initial={{
                  opacity: 0,
                  y: 20,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                className="rounded-3xl border bg-white p-6"

              >

                <div className="flex items-start justify-between">

                  <div>

                    <h3 className="text-lg font-black">

                      {candidate.fullName}

                    </h3>

                    <p className="text-slate-500">

                      {candidate.position}

                    </p>

                  </div>

                  {recruiterPlan ===
                    "corporate" && (
                    <GoldenBadge />
                  )}

                </div>

                <div className="mt-6 grid grid-cols-2 gap-5">

                  <InfoItem
                    label="Presentation"
                    value={`${candidate.presentationScore}%`}
                  />

                  <InfoItem
                    label="Communication"
                    value={`${candidate.communication}%`}
                  />

                  <InfoItem
                    label="Confidence"
                    value={`${candidate.confidence}%`}
                  />

                  <InfoItem
                    label="Duration"
                    value={`${candidate.duration} min`}
                  />

                </div>

                <button

                  onClick={() =>
                    onViewPresentation?.(
                      candidate
                    )
                  }

                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-indigo-700"

                >

                  <PlayCircle size={18} />

                  Watch Presentation

                </button>

              </motion.div>

            ))}

          </div>
          {/* =========================================================== */}
          {/* PAGINATION                                                  */}
          {/* =========================================================== */}

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border bg-white p-5">

              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-bold">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>
                {" - "}
                <span className="font-bold">
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredCandidates.length
                  )}
                </span>
                {" of "}
                <span className="font-bold">
                  {filteredCandidates.length}
                </span>
                {" candidates"}
              </p>

              <div className="flex items-center gap-2">

                <button
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(page - 1, 1)
                    )
                  }
                  className={`rounded-xl px-4 py-2 font-semibold transition ${
                    currentPage === 1
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white hover:bg-indigo-700"
                  }`}
                >
                  Previous
                </button>

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() =>
                      setCurrentPage(page)
                    }
                    className={`h-10 w-10 rounded-xl font-bold transition ${
                      currentPage === page
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(
                        page + 1,
                        totalPages
                      )
                    )
                  }
                  className={`rounded-xl px-4 py-2 font-semibold transition ${
                    currentPage === totalPages
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white hover:bg-indigo-700"
                  }`}
                >
                  Next
                </button>

              </div>

            </div>
          )}

        </>
      )}

    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              HELPER COMPONENTS                             */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
}) => (
  <motion.div
    whileHover={{
      y: -5,
      scale: 1.02,
    }}
    className="rounded-3xl border bg-white p-6 shadow-sm"
  >
    <div className="flex items-center justify-between">

      <div>

        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        <h2 className="mt-2 text-3xl font-black text-slate-900">
          {value}
        </h2>

      </div>

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
        {icon}
      </div>

    </div>
  </motion.div>
);

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
      {label}
    </p>

    <p className="mt-1 font-semibold text-slate-900 break-words">
      {value}
    </p>
  </div>
);

export default OralPresentationResults;