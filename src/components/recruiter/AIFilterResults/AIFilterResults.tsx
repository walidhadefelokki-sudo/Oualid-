import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  RefreshCw,
  Sparkles,
  Trophy,
  Star,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

import GoldenBadge from "../../GoldenBadge";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface AICandidate {
  id: number | string;
  name: string;
  role: string;
  exp: string;
  location: string;
  match: number;
  category: string;
  summary: string;
  email: string;
  phone: string;

  scores: {
    exp: number;
    skills: number;
    edu: number;
  };

  strengths: string[];
  weaknesses: string[];
}

interface Props {
  candidates: AICandidate[];
  recruiterPlan: "free" | "paid" | "corporate";
  loading?: boolean;

  onRefresh?: () => void;
  onOpenCandidate?: (candidate: AICandidate) => void;
}

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 8;

const CATEGORY_FILTERS = [
  "All",
  "Excellent match",
  "Bon match",
  "Match partiel",
];

const SORT_OPTIONS = [
  "Highest Match",
  "Lowest Match",
  "Most Experience",
  "Name",
];

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

const AIFilterResults: React.FC<Props> = ({
  candidates,
  recruiterPlan,
  loading = false,
  onRefresh,
  onOpenCandidate,
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Highest Match");

  const [expandedCandidate, setExpandedCandidate] =
    useState<number | string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------------------------------------------------------------- */
  /*                               FILTERING                                */
  /* ---------------------------------------------------------------------- */

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];

    if (search.trim()) {
      const q = search.toLowerCase();

      list = list.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(q) ||
          candidate.role.toLowerCase().includes(q) ||
          candidate.location.toLowerCase().includes(q)
      );
    }

    if (category !== "All") {
      list = list.filter(
        (candidate) => candidate.category === category
      );
    }

    switch (sortBy) {
      case "Highest Match":
        list.sort((a, b) => b.match - a.match);
        break;

      case "Lowest Match":
        list.sort((a, b) => a.match - b.match);
        break;

      case "Most Experience":
        list.sort(
          (a, b) =>
            parseInt(b.exp) -
            parseInt(a.exp)
        );
        break;

      case "Name":
        list.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        break;
    }

    return list;
  }, [candidates, search, category, sortBy]);

  /* ---------------------------------------------------------------------- */
  /*                              PAGINATION                                */
  /* ---------------------------------------------------------------------- */

  const totalPages = Math.ceil(
    filteredCandidates.length / PAGE_SIZE
  );

  const visibleCandidates = filteredCandidates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ---------------------------------------------------------------------- */
  /*                                STATS                                   */
  /* ---------------------------------------------------------------------- */

  const excellent = candidates.filter(
    (c) => c.match >= 90
  ).length;

  const average =
    candidates.length === 0
      ? 0
      : Math.round(
          candidates.reduce(
            (sum, c) => sum + c.match,
            0
          ) / candidates.length
        );

  const interviewReady = candidates.filter(
    (c) => c.match >= 80
  ).length;

  /* ---------------------------------------------------------------------- */
  /*                                 UI                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-8">

      {/* =============================================================== */}
      {/* HEADER                                                         */}
      {/* =============================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
              <Sparkles size={28} />
            </div>

            <div>

              <h1 className="text-3xl font-black text-slate-900">
                AI Filter Results
              </h1>

              <p className="mt-1 text-slate-500">
                AI ranking and candidate matching
              </p>

            </div>

          </div>

        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-indigo-600"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

        </div>

      </div>

      {/* =============================================================== */}
      {/* STATS                                                          */}
      {/* =============================================================== */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Candidates"
          value={candidates.length}
          icon={<Users size={24} />}
        />

        <StatCard
          title="Excellent Match"
          value={excellent}
          icon={<Trophy size={24} />}
        />

        <StatCard
          title="Interview Ready"
          value={interviewReady}
          icon={<CheckCircle2 size={24} />}
        />

        <StatCard
          title="Average Match"
          value={`${average}%`}
          icon={<TrendingUp size={24} />}
        />

      </div>

      {/* =============================================================== */}
      {/* FILTER BAR                                                     */}
      {/* =============================================================== */}

      <div className="rounded-3xl border bg-white p-6 shadow-sm">

        <div className="grid gap-4 xl:grid-cols-4">

          {/* Search */}

          <div className="relative">

            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search candidate..."
              className="w-full rounded-2xl border bg-slate-50 py-3 pl-11 pr-4 outline-none transition focus:border-indigo-500"
            />

          </div>

          {/* Category */}

          <select
            value={category}
            onChange={(e) => {
              setCurrentPage(1);
              setCategory(e.target.value);
            }}
            className="rounded-2xl border bg-slate-50 px-4 py-3 outline-none"
          >
            {CATEGORY_FILTERS.map((item) => (
              <option key={item}>
                {item}
              </option>
            ))}
          </select>

          {/* Sort */}

          <select
            value={sortBy}
            onChange={(e) => {
              setCurrentPage(1);
              setSortBy(e.target.value);
            }}
            className="rounded-2xl border bg-slate-50 px-4 py-3 outline-none"
          >
            {SORT_OPTIONS.map((item) => (
              <option key={item}>
                {item}
              </option>
            ))}
          </select>

          {/* Plan */}

          <div className="flex items-center justify-end">

            <GoldenBadge
              plan={recruiterPlan}
            />

          </div>

        </div>

      </div>
      {/* =============================================================== */}
      {/* LOADING                                                        */}
      {/* =============================================================== */}

      {loading && (
        <div className="rounded-3xl bg-white p-20 text-center shadow-sm border">
          <RefreshCw
            size={42}
            className="mx-auto mb-5 animate-spin text-indigo-600"
          />
          <h3 className="text-xl font-bold text-slate-900">
            AI is analyzing candidates...
          </h3>
          <p className="mt-2 text-slate-500">
            Please wait a moment.
          </p>
        </div>
      )}

      {/* =============================================================== */}
      {/* EMPTY STATE                                                    */}
      {/* =============================================================== */}

      {!loading && visibleCandidates.length === 0 && (
        <div className="rounded-3xl border bg-white p-20 text-center shadow-sm">

          <AlertTriangle
            size={60}
            className="mx-auto mb-5 text-amber-500"
          />

          <h3 className="text-2xl font-black text-slate-900">
            No candidates found
          </h3>

          <p className="mt-3 text-slate-500">
            Try changing the search filters.
          </p>

        </div>
      )}

      {/* =============================================================== */}
      {/* DESKTOP TABLE                                                  */}
      {/* =============================================================== */}

      {!loading && visibleCandidates.length > 0 && (
        <div className="hidden xl:block overflow-hidden rounded-3xl border bg-white shadow-sm">

          <table className="w-full">

            <thead className="bg-slate-100">

              <tr className="text-left text-sm font-bold text-slate-700">

                <th className="px-6 py-5">
                  Candidate
                </th>

                <th className="px-6 py-5">
                  Match
                </th>

                <th className="px-6 py-5">
                  Experience
                </th>

                <th className="px-6 py-5">
                  Location
                </th>

                <th className="px-6 py-5">
                  Category
                </th>

                <th className="px-6 py-5 text-center">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {visibleCandidates.map((candidate) => {

                const expanded =
                  expandedCandidate === candidate.id;

                return (
                  <React.Fragment key={candidate.id}>

                    <tr className="border-t hover:bg-slate-50 transition">

                      <td className="px-6 py-5">

                        <div>

                          <div className="font-bold text-slate-900">
                            {candidate.name}
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {candidate.role}
                          </div>

                        </div>

                      </td>

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-3">

                          <div className="h-3 w-32 overflow-hidden rounded-full bg-slate-200">

                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600"
                              style={{
                                width: `${candidate.match}%`,
                              }}
                            />

                          </div>

                          <span className="font-black text-indigo-700">
                            {candidate.match}%
                          </span>

                        </div>

                      </td>

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <Briefcase size={16} />

                          {candidate.exp}

                        </div>

                      </td>

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <MapPin size={16} />

                          {candidate.location}

                        </div>

                      </td>

                      <td className="px-6 py-5">

                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">

                          {candidate.category}

                        </span>

                      </td>

                      <td className="px-6 py-5">

                        <div className="flex justify-center gap-2">

                          <button
                            onClick={() =>
                              onOpenCandidate?.(candidate)
                            }
                            className="rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() =>
                              setExpandedCandidate(
                                expanded
                                  ? null
                                  : candidate.id
                              )
                            }
                            className="rounded-xl border p-2 hover:bg-slate-100"
                          >
                            {expanded ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>

                        </div>

                      </td>

                    </tr>

                    <AnimatePresence>

                      {expanded && (

                        <tr>

                          <td
                            colSpan={6}
                            className="bg-slate-50"
                          >

                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                              className="overflow-hidden p-8"
                            >

                              <div className="grid gap-8 lg:grid-cols-3">

                                {/* AI SUMMARY */}

                                <div>

                                  <h4 className="mb-3 flex items-center gap-2 text-lg font-black">

                                    <Sparkles
                                      size={20}
                                      className="text-indigo-600"
                                    />

                                    AI Summary

                                  </h4>

                                  <p className="leading-7 text-slate-600">

                                    {candidate.summary}

                                  </p>

                                </div>

                                {/* SCORES */}

                                <div>

                                  <h4 className="mb-4 text-lg font-black">

                                    AI Scores

                                  </h4>

                                  <InfoBar
                                    title="Experience"
                                    value={candidate.scores.exp}
                                  />

                                  <InfoBar
                                    title="Technical Skills"
                                    value={candidate.scores.skills}
                                  />

                                  <InfoBar
                                    title="Education"
                                    value={candidate.scores.edu}
                                  />

                                </div>

                                {/* RECOMMENDATION */}

                                <div>

                                  <h4 className="mb-4 text-lg font-black">

                                    Recommendation

                                  </h4>

                                  <div className="rounded-2xl bg-white p-5 shadow-sm border">

                                    {candidate.match >= 90 && (
                                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                        <CheckCircle2 size={18} />
                                        Excellent Candidate
                                      </div>
                                    )}

                                    {candidate.match >= 75 &&
                                      candidate.match < 90 && (
                                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                                          <Star size={18} />
                                          Worth Interviewing
                                        </div>
                                      )}

                                    {candidate.match < 75 && (
                                      <div className="flex items-center gap-2 text-amber-600 font-bold">
                                        <AlertTriangle size={18} />
                                        Keep as Backup
                                      </div>
                                    )}

                                  </div>

                                </div>

                              </div>

                              {/* Strengths / Weaknesses */}

                              <div className="mt-8 grid gap-8 lg:grid-cols-2">

                                <div>

                                  <h4 className="mb-4 text-lg font-black text-emerald-700">

                                    Strengths

                                  </h4>

                                  <ul className="space-y-3">

                                    {candidate.strengths.map((item) => (

                                      <li
                                        key={item}
                                        className="flex gap-3"
                                      >
                                        <CheckCircle2
                                          size={18}
                                          className="mt-1 text-emerald-600"
                                        />

                                        <span>{item}</span>

                                      </li>

                                    ))}

                                  </ul>

                                </div>

                                <div>

                                  <h4 className="mb-4 text-lg font-black text-amber-700">

                                    Weaknesses

                                  </h4>

                                  <ul className="space-y-3">

                                    {candidate.weaknesses.map((item) => (

                                      <li
                                        key={item}
                                        className="flex gap-3"
                                      >
                                        <AlertTriangle
                                          size={18}
                                          className="mt-1 text-amber-500"
                                        />

                                        <span>{item}</span>

                                      </li>

                                    ))}

                                  </ul>

                                </div>

                              </div>

                            </motion.div>

                          </td>

                        </tr>

                      )}

                    </AnimatePresence>

                  </React.Fragment>
                );

              })}

            </tbody>

          </table>

        </div>
      )}
      {/* =============================================================== */}
      {/* MOBILE CARDS                                                   */}
      {/* =============================================================== */}

      {!loading && visibleCandidates.length > 0 && (
        <div className="space-y-5 xl:hidden">

          {visibleCandidates.map((candidate) => {

            const expanded = expandedCandidate === candidate.id;

            return (
              <div
                key={candidate.id}
                className="rounded-3xl border bg-white p-6 shadow-sm"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-black text-slate-900">
                      {candidate.name}
                    </h3>

                    <p className="mt-1 text-slate-500">
                      {candidate.role}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">

                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                        {candidate.category}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                        {candidate.exp}
                      </span>

                    </div>

                  </div>

                  <div className="text-right">

                    <div className="text-3xl font-black text-indigo-700">
                      {candidate.match}%
                    </div>

                    <div className="text-xs text-slate-500">
                      AI Match
                    </div>

                  </div>

                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">

                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600"
                    style={{
                      width: `${candidate.match}%`,
                    }}
                  />

                </div>

                <div className="mt-6 flex gap-3">

                  <button
                    onClick={() =>
                      onOpenCandidate?.(candidate)
                    }
                    className="flex-1 rounded-2xl bg-indigo-600 py-3 font-bold text-white"
                  >
                    View
                  </button>

                  <button
                    onClick={() =>
                      setExpandedCandidate(
                        expanded ? null : candidate.id
                      )
                    }
                    className="rounded-2xl border px-5"
                  >
                    {expanded ? (
                      <ChevronUp />
                    ) : (
                      <ChevronDown />
                    )}
                  </button>

                </div>

                <AnimatePresence>

                  {expanded && (

                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                      className="overflow-hidden"
                    >

                      <div className="mt-6 border-t pt-6">

                        <p className="leading-7 text-slate-600">
                          {candidate.summary}
                        </p>

                        <div className="mt-6">

                          <InfoBar
                            title="Experience"
                            value={candidate.scores.exp}
                          />

                          <InfoBar
                            title="Technical Skills"
                            value={candidate.scores.skills}
                          />

                          <InfoBar
                            title="Education"
                            value={candidate.scores.edu}
                          />

                        </div>

                      </div>

                    </motion.div>

                  )}

                </AnimatePresence>

              </div>
            );

          })}

        </div>
      )}

      {/* =============================================================== */}
      {/* PAGINATION                                                     */}
      {/* =============================================================== */}

      {!loading &&
        totalPages > 1 && (
          <div className="flex items-center justify-between rounded-3xl border bg-white p-6">

            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((p) => p - 1)
              }
              className="rounded-xl border px-5 py-2 font-semibold disabled:opacity-40"
            >
              Previous
            </button>

            <div className="font-bold">
              Page {currentPage} / {totalPages}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => p + 1)
              }
              className="rounded-xl border px-5 py-2 font-semibold disabled:opacity-40"
            >
              Next
            </button>

          </div>
        )}

    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              HELPER COMPONENTS                             */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
}) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="rounded-3xl border bg-white p-6 shadow-sm"
  >
    <div className="flex items-center justify-between">

      <div>

        <div className="text-sm font-semibold text-slate-500">
          {title}
        </div>

        <div className="mt-2 text-3xl font-black text-slate-900">
          {value}
        </div>

      </div>

      <div className="rounded-2xl bg-indigo-100 p-4 text-indigo-700">
        {icon}
      </div>

    </div>
  </motion.div>
);

interface InfoBarProps {
  title: string;
  value: number;
}

const InfoBar: React.FC<InfoBarProps> = ({
  title,
  value,
}) => (
  <div className="mb-5">

    <div className="mb-2 flex justify-between text-sm">

      <span>{title}</span>

      <span className="font-bold">
        {value}%
      </span>

    </div>

    <div className="h-2 overflow-hidden rounded-full bg-slate-200">

      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600"
        style={{
          width: `${value}%`,
        }}
      />

    </div>

  </div>
);

export default AIFilterResults;