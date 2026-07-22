import React from "react";
import {
  Search,
  ArrowUpDown,
  Star,
  Brain,
  Briefcase,
} from "lucide-react";

import GoldenBadge from "../../GoldenBadge";

import {
  PreselectionLoading,
  PreselectionEmpty,
} from "../../preselection";

import useCorporateCandidateList from "../../../hooks/useCorporateCandidateList";

import {
  CorporateCandidateListProps,
  CorporateCandidate,
} from "../../../types/corporateCandidate";

import {
  CORPORATE_SORT_OPTIONS,
} from "../../../constants/corporateCandidate";

const CorporateCandidateList: React.FC<
  CorporateCandidateListProps
> = ({
  candidates,
  loading = false,
  recruiterRole,
  onCandidateClick,
}) => {
  const {
    candidates: candidateList,
    filters,
    sort,
    updateSort,
    setSearch,
  } = useCorporateCandidateList({
    candidates,
  });

  const isCorporate =
    recruiterRole?.toUpperCase() ===
    "CORPORATE";

  if (loading) {
    return <PreselectionLoading rows={8} />;
  }

  if (!candidateList.length) {
    return (
      <PreselectionEmpty
        title="No Candidates"
        description="No candidates match your filters."
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h2 className="text-2xl font-bold text-slate-900">
              Corporate Candidate List
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Preselected candidates are automatically
              displayed first, followed by AI ranking.
            </p>

          </div>

          <div className="text-right">

            <div className="text-3xl font-bold text-indigo-600">
              {candidateList.length}
            </div>

            <div className="text-sm text-slate-500">
              Candidates
            </div>

          </div>

        </div>

        {/* Search + Sort */}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">

          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search candidates..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />

          </div>

          <div className="relative">

            <ArrowUpDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={sort}
              onChange={(e) =>
                updateSort(
                  e.target
                    .value as typeof sort
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {CORPORATE_SORT_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

          </div>

        </div>

      </div>

      {/* Desktop */}

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">

        <table className="min-w-full">

          <thead className="bg-slate-50">

            <tr>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Candidate
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                AI Score
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Experience
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Status
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Applied
              </th>

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-100">
                        {candidateList.map(
              (candidate: CorporateCandidate) => (
                <tr
                  key={candidate.id}
                  onClick={() =>
                    onCandidateClick?.(candidate)
                  }
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  {/* Candidate */}

                  <td className="px-6 py-5">

                    <div className="flex items-center gap-4">

                      {candidate.avatarUrl ? (
                        <img
                          src={candidate.avatarUrl}
                          alt={candidate.fullName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                          {candidate.fullName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .substring(0, 2)}
                        </div>
                      )}

                      <div className="space-y-1">

                        <div className="flex items-center gap-2">

                          <span className="font-semibold text-slate-900">
                            {candidate.fullName}
                          </span>

                          {isCorporate && (
                            <GoldenBadge
                              visible={
                                candidate.isPreselected
                              }
                              size="sm"
                            />
                          )}

                        </div>

                        <p className="text-sm text-slate-500">
                          {candidate.email}
                        </p>

                        {candidate.jobTitle && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">

                            <Briefcase className="h-3 w-3" />

                            {candidate.jobTitle}

                          </div>
                        )}

                      </div>

                    </div>

                  </td>

                  {/* AI Score */}

                  <td className="px-6 py-5">

                    <div className="flex items-center gap-2">

                      <Brain className="h-4 w-4 text-indigo-500" />

                      <span className="font-semibold text-slate-900">
                        {candidate.aiScore}%
                      </span>

                    </div>

                    <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-slate-200">

                      <div
                        className={`h-full rounded-full ${
                          candidate.aiScore >= 85
                            ? "bg-green-500"
                            : candidate.aiScore >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${candidate.aiScore}%`,
                        }}
                      />

                    </div>

                  </td>

                  {/* Experience */}

                  <td className="px-6 py-5">

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">

                      {candidate.experience ?? 0} years

                    </span>

                  </td>

                  {/* Status */}

                  <td className="px-6 py-5">

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                        candidate.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : candidate.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : candidate.status === "preselected"
                          ? "bg-yellow-100 text-yellow-800"
                          : candidate.status === "reviewing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {candidate.status}
                    </span>

                  </td>

                  {/* Applied */}

                  <td className="px-6 py-5 text-sm text-slate-600">

                    {new Date(
                      candidate.appliedAt
                    ).toLocaleDateString()}

                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

      </div>
            {/* Mobile Cards */}

      <div className="space-y-4 lg:hidden">

        {candidateList.map(
          (candidate: CorporateCandidate) => (
            <div
              key={candidate.id}
              onClick={() =>
                onCandidateClick?.(candidate)
              }
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              {/* Header */}

              <div className="flex items-start justify-between">

                <div className="flex items-center gap-3">

                  {candidate.avatarUrl ? (
                    <img
                      src={candidate.avatarUrl}
                      alt={candidate.fullName}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                      {candidate.fullName
                        .split(" ")
                        .map((name) => name[0])
                        .join("")
                        .substring(0, 2)}
                    </div>
                  )}

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      {candidate.fullName}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {candidate.email}
                    </p>

                    {candidate.jobTitle && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">

                        <Briefcase className="h-3 w-3" />

                        {candidate.jobTitle}

                      </div>
                    )}

                  </div>

                </div>

                {isCorporate && (
                  <GoldenBadge
                    visible={candidate.isPreselected}
                    size="sm"
                  />
                )}

              </div>

              {/* AI Score */}

              <div className="mt-5">

                <div className="mb-2 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Brain className="h-4 w-4 text-indigo-500" />

                    <span className="text-sm font-medium text-slate-700">
                      AI Score
                    </span>

                  </div>

                  <span className="font-bold text-slate-900">
                    {candidate.aiScore}%
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                  <div
                    className={`h-full rounded-full ${
                      candidate.aiScore >= 85
                        ? "bg-green-500"
                        : candidate.aiScore >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${candidate.aiScore}%`,
                    }}
                  />

                </div>

              </div>

              {/* Details */}

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div>

                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Experience
                  </p>

                  <p className="mt-1 font-medium text-slate-800">
                    {candidate.experience ?? 0} years
                  </p>

                </div>

                <div>

                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      candidate.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : candidate.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : candidate.status === "preselected"
                        ? "bg-yellow-100 text-yellow-800"
                        : candidate.status === "reviewing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {candidate.status}
                  </span>

                </div>

                <div className="col-span-2">

                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Applied
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {new Date(
                      candidate.appliedAt
                    ).toLocaleDateString()}
                  </p>

                </div>

              </div>

              {/* Footer */}

              {candidate.isPreselected && (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800">

                  <Star className="h-4 w-4 fill-current" />

                  Preselected Candidate

                </div>
              )}

            </div>
          )
        )}

      </div>
          </div>
  );
};

export default CorporateCandidateList;