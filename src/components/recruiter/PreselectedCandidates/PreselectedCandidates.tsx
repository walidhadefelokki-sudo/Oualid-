import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  RefreshCw,
  Users,
  UserCheck,
  Briefcase,
  MapPin,
  Calendar,
  CheckCircle2,
  Star,
  Sparkles,
} from "lucide-react";

import GoldenBadge from "../../GoldenBadge";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export interface PreselectedCandidate {
  id: string;

  fullName: string;
  email: string;
  phone: string;

  position: string;
  location: string;

  experience: number;

  aiScore: number;

  quizScore?: number;

  oralPresentationScore?: number;

  status:
    | "pending"
    | "interview"
    | "hired"
    | "rejected";

  cvUrl?: string;

  createdAt: string;
}

interface PreselectedCandidatesProps {
  candidates: PreselectedCandidate[];

  recruiterPlan:
    | "free"
    | "paid"
    | "corporate";

  loading?: boolean;

  onRefresh?: () => void;

  onOpenCV?: (
    candidate: PreselectedCandidate
  ) => void;

  onInterview?: (
    candidate: PreselectedCandidate
  ) => void;

  onHire?: (
    candidate: PreselectedCandidate
  ) => void;

  onReject?: (
    candidate: PreselectedCandidate
  ) => void;
}

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const STATUS_FILTERS = [
  "All",
  "pending",
  "interview",
  "hired",
  "rejected",
];

const STATUS_LABELS: Record<string, string> = {
  All: "Tous",
  pending: "En attente",
  interview: "Entretien",
  hired: "Embauché",
  rejected: "Rejeté",
};

const statusLabel = (status: string) => STATUS_LABELS[status] || status;

const SORT_OPTIONS = [
  {
    id: "ai",
    label: "Score IA",
  },
  {
    id: "experience",
    label: "Expérience",
  },
  {
    id: "recent",
    label: "Plus récent",
  },
];

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const PreselectedCandidates: React.FC<
  PreselectedCandidatesProps
> = ({
  candidates,
  recruiterPlan,
  loading = false,
  onRefresh,
  onOpenCV,
  onInterview,
  onHire,
  onReject,
}) => {

  /* ---------------------------------------------------------------------- */
  /*                                  STATE                                 */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [sortBy, setSortBy] =
    useState("ai");

  const [currentPage, setCurrentPage] =
    useState(1);

  const PAGE_SIZE = 10;

  /* ---------------------------------------------------------------------- */
  /*                             FILTER OPTIONS                              */
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
        locationFilter !==
        "All"
      ) {

        data = data.filter(
          (candidate) =>
            candidate.location ===
            locationFilter
        );

      }

      /* Status */

      if (
        statusFilter !==
        "All"
      ) {

        data = data.filter(
          (candidate) =>
            candidate.status ===
            statusFilter
        );

      }

      /* Sorting */

      switch (sortBy) {

        case "experience":

          data.sort(
            (a, b) =>
              b.experience -
              a.experience
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
              b.aiScore -
              a.aiScore
          );

      }

      return data;

    }, [
      candidates,
      search,
      locationFilter,
      statusFilter,
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

    return {

      total:
        candidates.length,

      interview:
        candidates.filter(
          (candidate) =>
            candidate.status ===
            "interview"
        ).length,

      hired:
        candidates.filter(
          (candidate) =>
            candidate.status ===
            "hired"
        ).length,

      averageAI:
        candidates.length === 0
          ? 0
          : Math.round(
              candidates.reduce(
                (
                  total,
                  candidate
                ) =>
                  total +
                  candidate.aiScore,
                0
              ) /
                candidates.length
            ),

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

            <UserCheck className="text-emerald-600" />

            <h1 className="text-3xl font-black text-slate-900">

              Candidats présélectionnés

            </h1>

            {recruiterPlan ===
              "corporate" && (
              <GoldenBadge visible />
            )}

          </div>

          <p className="mt-2 text-slate-500">

Gérez vos candidats présélectionnés, planifiez des entretiens et finalisez votre processus de recrutement.

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
          value={stats.total}
          icon={<Users size={20} />}
        />

        <StatCard
          title="Entretiens"
          value={stats.interview}
          icon={<Calendar size={20} />}
        />

        <StatCard
          title="Embauchés"
          value={stats.hired}
          icon={<CheckCircle2 size={20} />}
        />

        <StatCard
          title="Moyenne IA"
          value={`${stats.averageAI}%`}
          icon={<Sparkles size={20} />}
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
              className="w-full rounded-xl border pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />

          </div>

          {/* Status */}

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            {STATUS_FILTERS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(status)}
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
              (location) => (
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
              (option) => (
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
              className="animate-spin text-emerald-600"
            />

            <p className="font-semibold text-slate-500">

              Loading candidates...

            </p>

          </div>

        </div>

      ) : filteredCandidates.length === 0 ? (

        <div className="rounded-3xl border bg-white p-20 text-center">

          <UserCheck
            size={60}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-6 text-2xl font-black">

            No Preselected Candidates

          </h2>

          <p className="mt-2 text-slate-500">

            Try changing your search or filters.

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

                    Experience

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    AI Score

                  </th>

                  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-widest">

                    Status

                  </th>

                  <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-widest">

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

                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">

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

                    {/* Experience */}

                    <td className="px-6 py-5">

                      {candidate.experience} ans

                    </td>

                    {/* AI Score */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">

                          <div
                            className="h-full rounded-full bg-emerald-500"
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

                      {candidate.status ===
                        "pending" && (

                        <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-black text-yellow-700">

                          En attente

                        </span>

                      )}

                      {candidate.status ===
                        "interview" && (

                        <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-black text-blue-700">

                          Entretien

                        </span>

                      )}

                      {candidate.status ===
                        "hired" && (

                        <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-700">

                          Embauché

                        </span>

                      )}

                      {candidate.status ===
                        "rejected" && (

                        <span className="rounded-full bg-red-100 px-4 py-2 text-xs font-black text-red-700">

                          Rejeté

                        </span>

                      )}

                    </td>

                    {/* Actions */}

                    <td className="px-6 py-5">

                      <div className="flex justify-end gap-2 flex-wrap">

                        <button

                          onClick={() =>
                            onOpenCV?.(
                              candidate
                            )
                          }

                          className="rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-100"

                        >

                          CV

                        </button>

                        <button

                          onClick={() =>
                            onInterview?.(
                              candidate
                            )
                          }

                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"

                        >

                          Entretien

                        </button>

                        <button

                          onClick={() =>
                            onHire?.(
                              candidate
                            )
                          }

                          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"

                        >

                          Embaucher

                        </button>

                        <button

                          onClick={() =>
                            onReject?.(
                              candidate
                            )
                          }

                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"

                        >

                          Rejeter

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
                    <GoldenBadge visible />
                  )}

                </div>

                <div className="mt-6 grid grid-cols-2 gap-5">

                  <InfoItem
                    label="Expérience"
                    value={`${candidate.experience} ans`}
                  />

                  <InfoItem
                    label="Score IA"
                    value={`${candidate.aiScore}%`}
                  />

                  <InfoItem
                    label="Localisation"
                    value={candidate.location}
                  />

                  <InfoItem
                    label="Statut"
                    value={statusLabel(candidate.status)}
                  />

                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">

                  <button
                    onClick={() =>
                      onInterview?.(
                        candidate
                      )
                    }
                    className="rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 transition"
                  >
                    Entretien
                  </button>

                  <button
                    onClick={() =>
                      onHire?.(
                        candidate
                      )
                    }
                    className="rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 transition"
                  >
                    Embaucher
                  </button>

                  <button
                    onClick={() =>
                      onReject?.(
                        candidate
                      )
                    }
                    className="rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 transition"
                  >
                    Rejeter
                  </button>

                  <button
                    onClick={() =>
                      onOpenCV?.(
                        candidate
                      )
                    }
                    className="rounded-xl border py-3 font-bold hover:bg-slate-100 transition"
                  >
                    Voir le CV
                  </button>

                </div>

              </motion.div>

            ))}

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
                      : "bg-slate-900 text-white hover:bg-emerald-700"
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
                        ? "bg-emerald-600 text-white"
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
                      : "bg-slate-900 text-white hover:bg-emerald-700"
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

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
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

export default PreselectedCandidates;