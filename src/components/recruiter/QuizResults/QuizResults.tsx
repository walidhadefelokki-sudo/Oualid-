import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  RefreshCw,
  Trophy,
  Award,
  BarChart3,
  Users,
  Sparkles,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

import GoldenBadge from "../../GoldenBadge";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface QuizCandidate {
  id: string;

  fullName: string;
  email: string;
  position: string;
  location: string;

  quizScore: number;

  questionsAnswered: number;
  totalQuestions: number;

  duration: number;

  aiScore?: number;

  createdAt: string;
}

interface QuizResultsProps {
  candidates: QuizCandidate[];

  recruiterPlan: "free" | "paid" | "corporate";

  loading?: boolean;

  onRefresh?: () => void;

  onOpenCandidate?: (
    candidate: QuizCandidate
  ) => void;
}

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const SORT_OPTIONS = [
  {
    id: "score",
    label: "Score du quiz",
  },
  {
    id: "duration",
    label: "Plus rapide",
  },
  {
    id: "recent",
    label: "Plus récent",
  },
];

const SCORE_FILTERS = [
  "Tous",
  "90+",
  "80-89",
  "70-79",
  "60-69",
  "<60",
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const QuizResults: React.FC<
  QuizResultsProps
> = ({
  candidates,
  recruiterPlan,
  loading = false,
  onRefresh,
  onOpenCandidate,
}) => {
  /* ---------------------------------------------------------------------- */
  /*                                  STATE                                 */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] =
    useState("");

  const [scoreFilter, setScoreFilter] =
    useState("Tous");

  const [locationFilter, setLocationFilter] =
    useState("Tous");

  const [sortBy, setSortBy] =
    useState("score");

  const [currentPage, setCurrentPage] =
    useState(1);

  const PAGE_SIZE = 10;

  /* ---------------------------------------------------------------------- */
  /*                             AVAILABLE FILTERS                           */
  /* ---------------------------------------------------------------------- */

  const locations = useMemo(() => {
    const values = Array.from(
      new Set(
        candidates.map(
          (candidate) => candidate.location
        )
      )
    );

    return ["Tous", ...values];
  }, [candidates]);

  /* ---------------------------------------------------------------------- */
  /*                              FILTER LOGIC                               */
  /* ---------------------------------------------------------------------- */

  const filteredCandidates =
    useMemo(() => {
      let data = [...candidates];

      /* Search */

      if (search.trim()) {
        const value =
          search.toLowerCase();

        data = data.filter(
          (candidate) =>
            candidate.fullName
              .toLowerCase()
              .includes(value) ||
            candidate.email
              .toLowerCase()
              .includes(value) ||
            candidate.position
              .toLowerCase()
              .includes(value)
        );
      }

      /* Location */

      if (locationFilter !== "Tous") {
        data = data.filter(
          (candidate) =>
            candidate.location ===
            locationFilter
        );
      }

      /* Score */

      if (scoreFilter !== "Tous") {
        data = data.filter(
          (candidate) => {
            const score =
              candidate.quizScore;

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
              b.quizScore -
              a.quizScore
          );
      }

      return data;
    }, [
      candidates,
      search,
      scoreFilter,
      locationFilter,
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
  /*                                STATISTICS                               */
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
                candidate.quizScore,
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
            candidate.quizScore >=
            90
        ).length,

      passed:
        candidates.filter(
          (candidate) =>
            candidate.quizScore >=
            70
        ).length,
    };
  }, [candidates]);

  /* ---------------------------------------------------------------------- */
  /*                                   UI                                   */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-8">

      {/* =============================================================== */}
      {/* HEADER                                                          */}
      {/* =============================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

        <div>

          <div className="flex items-center gap-3">

            <Award className="text-amber-500" />

            <h1 className="text-3xl font-black text-slate-900">
              Résultats des quiz
            </h1>

            {recruiterPlan ===
              "corporate" && (
              <GoldenBadge visible />
            )}

          </div>

          <p className="mt-2 text-slate-500">

Consultez les résultats d'évaluation, les classements et les performances des candidats.

          </p>

        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border px-5 py-3 hover:bg-slate-50 transition"
        >
          <RefreshCw size={18} />

          Actualiser
        </button>

      </div>

      {/* =============================================================== */}
      {/* STATISTICS                                                      */}
      {/* =============================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

        <StatCard
          title="Candidats"
          value={
            stats.candidates
          }
          icon={
            <Users size={20} />
          }
        />

        <StatCard
          title="Moyenne"
          value={`${stats.average}%`}
          icon={
            <BarChart3
              size={20}
            />
          }
        />

        <StatCard
          title="Excellents"
          value={
            stats.excellent
          }
          icon={
            <Trophy
              size={20}
            />
          }
        />

        <StatCard
          title="Réussi"
          value={stats.passed}
          icon={
            <CheckCircle2
              size={20}
            />
          }
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
              placeholder="Rechercher un candidat..."
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
              (
                score
              ) => (
                <option
                  key={score}
                  value={
                    score
                  }
                >
                  {score}
                </option>
              )
            )}
          </select>

          {/* Location */}

          <select
            value={
              locationFilter
            }
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
                  key={
                    location
                  }
                  value={
                    location
                  }
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
                  key={
                    option.id
                  }
                  value={
                    option.id
                  }
                >
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>

        </div>

      </div>
      {/* =============================================================== */}
      {/* LOADING / EMPTY STATES                                          */}
      {/* =============================================================== */}

      {loading ? (
        <div className="rounded-3xl border bg-white p-20 flex items-center justify-center">

          <div className="flex flex-col items-center gap-5">

            <RefreshCw
              size={42}
              className="animate-spin text-blue-600"
            />

            <p className="font-semibold text-slate-500">
              Chargement des résultats...
            </p>

          </div>

        </div>
      ) : filteredCandidates.length === 0 ? (

        <div className="rounded-3xl border bg-white p-20 text-center">

          <Award
            size={60}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-6 text-2xl font-black">
            Aucun résultat de quiz trouvé
          </h2>

          <p className="mt-2 text-slate-500">
            Essayez de modifier votre recherche ou vos filtres.
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
                    Candidat
                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">
                    Poste
                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">
                    Score du quiz
                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">
                    Questions
                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">
                    Durée
                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">
                    Classement
                  </th>

                  <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-widest">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {paginatedCandidates.map(
                  (
                    candidate,
                    index
                  ) => (

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

                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">

                            {candidate.fullName
                              .split(" ")
                              .map(
                                (name) =>
                                  name[0]
                              )
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

                      <td className="px-6 py-5 font-medium">

                        {candidate.position}

                      </td>

                      {/* Quiz Score */}

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-3">

                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">

                            <div
                              className={`h-full rounded-full ${
                                candidate.quizScore >= 90
                                  ? "bg-green-500"
                                  : candidate.quizScore >= 70
                                  ? "bg-blue-500"
                                  : "bg-red-500"
                              }`}
                              style={{
                                width: `${candidate.quizScore}%`,
                              }}
                            />

                          </div>

                          <span className="font-bold">

                            {candidate.quizScore}%

                          </span>

                        </div>

                      </td>

                      {/* Questions */}

                      <td className="px-6 py-5">

                        {candidate.questionsAnswered}
                        /
                        {candidate.totalQuestions}

                      </td>

                      {/* Duration */}

                      <td className="px-6 py-5">

                        {candidate.duration} min

                      </td>

                      {/* Ranking */}

                      <td className="px-6 py-5">

                        {index === 0 && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-xs font-black text-yellow-700">

                            🥇 Premier

                          </span>
                        )}

                        {index === 1 && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-xs font-black">

                            🥈 Deuxième

                          </span>
                        )}

                        {index === 2 && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-xs font-black text-orange-700">

                            🥉 Troisième

                          </span>
                        )}

                        {index > 2 && (
                          <span className="font-semibold text-slate-500">

                            #{index + 1}

                          </span>
                        )}

                      </td>

                      {/* Action */}

                      <td className="px-6 py-5">

                        <div className="flex justify-end">

                          <button

                            onClick={() =>
                              onOpenCandidate?.(
                                candidate
                              )
                            }

                            className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white transition hover:bg-blue-700"

                          >

                            Voir les détails

                          </button>

                        </div>

                      </td>

                    </motion.tr>

                  )
                )}

              </tbody>

            </table>

          </div>

          {/* =========================================================== */}
          {/* MOBILE CARDS                                                */}
          {/* =========================================================== */}

          <div className="grid gap-5 xl:hidden">

            {paginatedCandidates.map(
              (candidate) => (

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
                      <GoldenBadge visible />
                    )}

                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-5">

                    <InfoItem
                      label="Score"
                      value={`${candidate.quizScore}%`}
                    />

                    <InfoItem
                      label="Questions"
                      value={`${candidate.questionsAnswered}/${candidate.totalQuestions}`}
                    />

                    <InfoItem
                      label="Durée"
                      value={`${candidate.duration} min`}
                    />

                    <InfoItem
                      label="Localisation"
                      value={candidate.location}
                    />

                  </div>

                  <button

                    onClick={() =>
                      onOpenCandidate?.(
                        candidate
                      )
                    }

                    className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-blue-700"

                  >

                    Voir le candidat

                  </button>

                </motion.div>

              )
            )}

          </div>
          {/* =========================================================== */}
          {/* PAGINATION                                                  */}
          {/* =========================================================== */}

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border bg-white p-5">

              <p className="text-sm text-slate-500">
                Affichage{" "}
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
                {" sur "}
                <span className="font-bold">
                  {filteredCandidates.length}
                </span>
                {" candidats"}
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
                  Précédent
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
                  Suivant
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

export default QuizResults;