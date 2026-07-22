import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Filter,
  Users,
  Star,
  Trophy,
  FileText,
  RefreshCw,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import CorporateCandidateList from "../CorporateCandidateList";
import GoldenBadge from "../../GoldenBadge";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export interface CandidateCV {
  id: string;
  fullName: string;
  email: string;
  phone: string;

  position: string;
  experience: number;
  location: string;

  aiScore: number;
  quizScore?: number;
  oralPresentationScore?: number;

  isPreselected: boolean;

  cvUrl?: string;
  createdAt: string;
}

interface CVDirectoryProps {
  candidates: CandidateCV[];

  loading?: boolean;

  recruiterPlan: "free" | "paid" | "corporate";

  onOpenCV?: (candidate: CandidateCV) => void;

  onRefresh?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                               FILTER OPTIONS                               */
/* -------------------------------------------------------------------------- */

const EXPERIENCE_FILTERS = [
  "All",
  "0-2",
  "3-5",
  "5-10",
  "10+",
];

const SORT_OPTIONS = [
  {
    id: "ai",
    label: "AI Score",
  },
  {
    id: "experience",
    label: "Experience",
  },
  {
    id: "recent",
    label: "Newest",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const CVDirectory: React.FC<CVDirectoryProps> = ({
  candidates,
  recruiterPlan,
  loading = false,
  onOpenCV,
  onRefresh,
}) => {
  /* ---------------------------------------------------------------------- */
  /*                                 STATE                                  */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] = useState("");

  const [locationFilter, setLocationFilter] =
    useState("All");

  const [experienceFilter, setExperienceFilter] =
    useState("All");

  const [sortBy, setSortBy] =
    useState("ai");

  const [currentPage, setCurrentPage] =
    useState(1);

  const PAGE_SIZE = 10;

  /* ---------------------------------------------------------------------- */
  /*                              FILTER DATA                               */
  /* ---------------------------------------------------------------------- */

  const availableLocations = useMemo(() => {
    const values = Array.from(
      new Set(candidates.map((c) => c.location))
    );

    return ["All", ...values];
  }, [candidates]);

  /* ---------------------------------------------------------------------- */
  /*                             FILTER LOGIC                               */
  /* ---------------------------------------------------------------------- */

  const filteredCandidates = useMemo(() => {
    let data = [...candidates];

    /* Search */

    if (search.trim()) {
      const value = search.toLowerCase();

      data = data.filter(
        (candidate) =>
          candidate.fullName
            .toLowerCase()
            .includes(value) ||
          candidate.position
            .toLowerCase()
            .includes(value) ||
          candidate.location
            .toLowerCase()
            .includes(value)
      );
    }

    /* Location */

    if (locationFilter !== "All") {
      data = data.filter(
        (candidate) =>
          candidate.location === locationFilter
      );
    }

    /* Experience */

    if (experienceFilter !== "All") {
      data = data.filter((candidate) => {
        const exp = candidate.experience;

        switch (experienceFilter) {
          case "0-2":
            return exp <= 2;

          case "3-5":
            return exp >= 3 && exp <= 5;

          case "5-10":
            return exp > 5 && exp <= 10;

          case "10+":
            return exp > 10;

          default:
            return true;
        }
      });
    }

    /* Sort */

    switch (sortBy) {
      case "experience":
        data.sort(
          (a, b) =>
            b.experience - a.experience
        );
        break;

      case "recent":
        data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );
        break;

      default:
        data.sort((a, b) => {
          if (
            a.isPreselected &&
            !b.isPreselected
          )
            return -1;

          if (
            !a.isPreselected &&
            b.isPreselected
          )
            return 1;

          return b.aiScore - a.aiScore;
        });
    }

    return data;
  }, [
    candidates,
    search,
    locationFilter,
    experienceFilter,
    sortBy,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                              PAGINATION                                */
  /* ---------------------------------------------------------------------- */

  const totalPages = Math.ceil(
    filteredCandidates.length / PAGE_SIZE
  );

  const paginatedCandidates =
    filteredCandidates.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

  /* ---------------------------------------------------------------------- */
  /*                              STATISTICS                                */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {
    return {
      total: candidates.length,

      preselected:
        candidates.filter(
          (c) => c.isPreselected
        ).length,

      averageAI:
        candidates.length === 0
          ? 0
          : Math.round(
              candidates.reduce(
                (sum, c) =>
                  sum + c.aiScore,
                0
              ) / candidates.length
            ),

      excellent:
        candidates.filter(
          (c) => c.aiScore >= 90
        ).length,
    };
  }, [candidates]);

  /* ---------------------------------------------------------------------- */
  /*                                 UI                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-8">

      {/* --------------------------------------------------------------- */}
      {/* HEADER                                                          */}
      {/* --------------------------------------------------------------- */}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

        <div>

          <div className="flex items-center gap-3">

            <Sparkles className="text-amber-500" />

            <h1 className="text-3xl font-black text-slate-900">

              CV Directory

            </h1>

            {recruiterPlan === "corporate" && (
              <GoldenBadge />
            )}

          </div>

          <p className="text-slate-500 mt-2">

            Browse, filter and rank every received CV.

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

      {/* --------------------------------------------------------------- */}
      {/* STATS                                                           */}
      {/* --------------------------------------------------------------- */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

        <StatCard
          title="Candidates"
          value={stats.total}
          icon={<Users size={20} />}
        />

        <StatCard
          title="Preselected"
          value={stats.preselected}
          icon={<Star size={20} />}
        />

        <StatCard
          title="Average AI"
          value={`${stats.averageAI}%`}
          icon={<Sparkles size={20} />}
        />

        <StatCard
          title="Excellent"
          value={stats.excellent}
          icon={<Trophy size={20} />}
        />

      </div>

      {/* --------------------------------------------------------------- */}
      {/* SEARCH + FILTERS                                                */}
      {/* --------------------------------------------------------------- */}

      <div className="rounded-3xl bg-white border p-6">

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
                setSearch(e.target.value)
              }
              placeholder="Search candidate..."
              className="w-full rounded-xl border pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Location */}

          <select
            value={locationFilter}
            onChange={(e) =>
              setLocationFilter(e.target.value)
            }
            className="rounded-xl border px-4 py-3"
          >
            {availableLocations.map((location) => (
              <option
                key={location}
                value={location}
              >
                {location}
              </option>
            ))}
          </select>

          {/* Experience */}

          <select
            value={experienceFilter}
            onChange={(e) =>
              setExperienceFilter(
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            {EXPERIENCE_FILTERS.map((exp) => (
              <option
                key={exp}
                value={exp}
              >
                {exp}
              </option>
            ))}
          </select>

          {/* Sort */}

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value)
            }
            className="rounded-xl border px-4 py-3"
          >
            {SORT_OPTIONS.map((option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.label}
              </option>
            ))}
          </select>

        </div>
      </div>

            {/* --------------------------------------------------------------- */}
      {/* LOADING                                                         */}
      {/* --------------------------------------------------------------- */}

      {loading ? (
        <div className="rounded-3xl bg-white border p-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-5">

            <RefreshCw
              size={42}
              className="animate-spin text-blue-600"
            />

            <p className="text-slate-500 font-semibold">
              Loading candidates...
            </p>

          </div>
        </div>
      ) : filteredCandidates.length === 0 ? (

        /* ------------------------------------------------------------- */
        /* EMPTY STATE                                                   */
        /* ------------------------------------------------------------- */

        <div className="rounded-3xl bg-white border p-20 text-center">

          <FileText
            size={60}
            className="mx-auto text-slate-300"
          />

          <h2 className="text-2xl font-black mt-6">

            No Candidates Found

          </h2>

          <p className="text-slate-500 mt-2">

            Try changing your search filters.

          </p>

        </div>

      ) : (

        <>
          {/* ----------------------------------------------------------- */}
          {/* DESKTOP TABLE                                              */}
          {/* ----------------------------------------------------------- */}

          <div className="hidden xl:block overflow-hidden rounded-3xl border bg-white">

            <table className="w-full">

              <thead className="bg-slate-50">

                <tr className="text-left">

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest">
                    Candidate
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest">
                    Position
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest">
                    Experience
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest">
                    Location
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest">
                    AI
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest">
                    Status
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-right">
                    Actions
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

                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-700">

                          {candidate.fullName
                            .split(" ")
                            .map((n) => n[0])
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

                      <span className="font-semibold">

                        {candidate.position}

                      </span>

                    </td>

                    {/* Experience */}

                    <td className="px-6 py-5">

                      {candidate.experience} years

                    </td>

                    {/* Location */}

                    <td className="px-6 py-5">

                      {candidate.location}

                    </td>

                    {/* AI */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">

                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${candidate.aiScore}%`,
                            }}
                          />

                        </div>

                        <span className="font-bold">

                          {candidate.aiScore}%

                        </span>

                      </div>

                    </td>

                    {/* Status */}

                    <td className="px-6 py-5">

                      {candidate.isPreselected ? (

                        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-700">

                          <Star size={12} />

                          Preselected

                        </span>

                      ) : (

                        <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">

                          Pending

                        </span>

                      )}

                    </td>

                    {/* Actions */}

                    <td className="px-6 py-5">

                      <div className="flex justify-end">

                        <button
                          onClick={() =>
                            onOpenCV?.(candidate)
                          }
                          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
                        >
                          Open CV
                        </button>

                      </div>

                    </td>

                  </motion.tr>

                ))}

              </tbody>

            </table>

          </div>

          {/* ----------------------------------------------------------- */}
          {/* MOBILE CARDS                                               */}
          {/* ----------------------------------------------------------- */}

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

                <div className="flex justify-between items-start">

                  <div>

                    <h3 className="text-lg font-black">

                      {candidate.fullName}

                    </h3>

                    <p className="text-slate-500">

                      {candidate.position}

                    </p>

                  </div>

                  {candidate.isPreselected && (
                    <GoldenBadge />
                  )}

                </div>

                <div className="grid grid-cols-2 gap-5 mt-6">

                  <InfoItem
                    label="Experience"
                    value={`${candidate.experience} years`}
                  />

                  <InfoItem
                    label="Location"
                    value={candidate.location}
                  />

                  <InfoItem
                    label="AI Score"
                    value={`${candidate.aiScore}%`}
                  />

                  <InfoItem
                    label="Email"
                    value={candidate.email}
                  />

                </div>

                <button
                  onClick={() =>
                    onOpenCV?.(candidate)
                  }
                  className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-bold text-white hover:bg-blue-700 transition"
                >
                  View CV
                </button>

              </motion.div>

            ))}

          </div>

          {/* ----------------------------------------------------------- */}
          {/* CORPORATE CANDIDATE LIST                                   */}
          {/* ----------------------------------------------------------- */}

          {recruiterPlan === "corporate" && (
            <CorporateCandidateList
              candidates={paginatedCandidates}
            />
          )}

          {/* ----------------------------------------------------------- */}
          {/* PAGINATION                                                  */}
          {/* ----------------------------------------------------------- */}

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
                      : "bg-slate-900 text-white hover:bg-blue-700"
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
                        ? "bg-blue-600 text-white"
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
                      : "bg-slate-900 text-white hover:bg-blue-700"
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
/*                             HELPER COMPONENTS                              */
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

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
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

export default CVDirectory;