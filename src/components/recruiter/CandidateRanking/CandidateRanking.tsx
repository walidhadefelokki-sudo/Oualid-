import { useEffect, useMemo, useState } from "react";

import {
  Trophy,
  Search,
  RefreshCw,
  Download,
  Filter,
} from "lucide-react";

import RankingHeader from "./RankingHeader";
import RankingFilters from "./RankingFilters";
import RankingStats from "./RankingStats";
import RankingTable from "./RankingTable";
import RankingLoading from "./RankingLoading";
import RankingEmpty from "./RankingEmpty";

import rankingService from "../../../services/ranking.service";

import {
  CandidateRanking as CandidateRankingType,
  RankingFilters as RankingFiltersType,
  RankingSort,
} from "../../../types/ranking";

import {
  DEFAULT_SORT,
  DEFAULT_FILTERS,
} from "../../../constants/ranking";

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function CandidateRanking() {

  /////////////////////////////////////////////////////////////
  // STATE
  /////////////////////////////////////////////////////////////

  const [loading, setLoading] =
    useState(true);

  const [applications, setApplications] =
    useState<CandidateRankingType[]>([]);

  const [search, setSearch] =
    useState("");

  const [filters, setFilters] =
    useState<RankingFiltersType>(
      DEFAULT_FILTERS
    );

  const [sort, setSort] =
    useState<RankingSort>(
      DEFAULT_SORT
    );

  const [refreshing, setRefreshing] =
    useState(false);

  /////////////////////////////////////////////////////////////
  // LOAD
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    loadRanking();

  }, []);

  /////////////////////////////////////////////////////////////
  // LOAD FUNCTION
  /////////////////////////////////////////////////////////////

  async function loadRanking() {

    try {

      setLoading(true);

      const data =
        await rankingService.getRanking();

      setApplications(data);

    }

    catch (error) {

      console.error(error);

    }

    finally {

      setLoading(false);

    }

  }

  /////////////////////////////////////////////////////////////
  // REFRESH
  /////////////////////////////////////////////////////////////

  async function refreshRanking() {

    try {

      setRefreshing(true);

      const data =
        await rankingService.recalculateRanking();

      setApplications(data);

    }

    catch (error) {

      console.error(error);

    }

    finally {

      setRefreshing(false);

    }

  }

  /////////////////////////////////////////////////////////////
  // FILTERED
  /////////////////////////////////////////////////////////////

  const filteredApplications =
    useMemo(() => {

      let list = [...applications];

      /////////////////////////////////////////////////////////
      // SEARCH
      /////////////////////////////////////////////////////////

      if (search.trim()) {

        const value =
          search.toLowerCase();

        list = list.filter(

          candidate =>

            candidate.fullName
              .toLowerCase()
              .includes(value)

            ||

            candidate.email
              .toLowerCase()
              .includes(value)

        );

      }

      /////////////////////////////////////////////////////////
      // MIN AI SCORE
      /////////////////////////////////////////////////////////

      if (
        filters.minimumAIScore > 0
      ) {

        list = list.filter(

          candidate =>

            candidate.aiScore >=
            filters.minimumAIScore

        );

      }

      /////////////////////////////////////////////////////////
      // MIN QUIZ SCORE
      /////////////////////////////////////////////////////////

      if (
        filters.minimumQuizScore > 0
      ) {

        list = list.filter(

          candidate =>

            (candidate.quizScore ?? 0) >=
            filters.minimumQuizScore

        );

      }

      /////////////////////////////////////////////////////////
      // ONLY PRESELECTED
      /////////////////////////////////////////////////////////

      if (
        filters.preselectedOnly
      ) {

        list = list.filter(

          candidate =>

            candidate.isPreselected

        );

      }

      /////////////////////////////////////////////////////////
      // SORT
      /////////////////////////////////////////////////////////

      switch (sort) {

        case "ai":

          list.sort(

            (a, b) =>

              b.aiScore - a.aiScore

          );

          break;

        case "quiz":

          list.sort(

            (a, b) =>

              (b.quizScore ?? 0)

              -

              (a.quizScore ?? 0)

          );

          break;

        case "experience":

          list.sort(

            (a, b) =>

              b.experienceYears

              -

              a.experienceYears

          );

          break;

        case "alphabetical":

          list.sort(

            (a, b) =>

              a.fullName.localeCompare(

                b.fullName

              )

          );

          break;

        case "newest":

          list.sort(

            (a, b) =>

              new Date(
                b.appliedAt
              ).getTime()

              -

              new Date(
                a.appliedAt
              ).getTime()

          );

          break;

      }

      /////////////////////////////////////////////////////////
      // POSITION
      /////////////////////////////////////////////////////////

      return list.map(

        (candidate, index) => ({

          ...candidate,

          rankingPosition:
            index + 1,

        })

      );

    },

    [

      applications,

      search,

      filters,

      sort,

    ]);

  /////////////////////////////////////////////////////////////
  // STATS
  /////////////////////////////////////////////////////////////

  const statistics =
    useMemo(() => {

      const total =
        filteredApplications.length;

      const averageAI =

        total === 0

          ? 0

          :

          filteredApplications.reduce(

            (sum, candidate) =>

              sum +

              candidate.aiScore,

            0

          ) / total;

      const highestAI =

        total === 0

          ? 0

          :

          Math.max(

            ...filteredApplications.map(

              c => c.aiScore

            )

          );

      const preselected =

        filteredApplications.filter(

          c =>

            c.isPreselected

        ).length;

      return {

        total,

        averageAI,

        highestAI,

        preselected,

      };

    },

    [

      filteredApplications,

    ]);

  /////////////////////////////////////////////////////////////
  // LOADING
  /////////////////////////////////////////////////////////////

  if (loading) {

    return <RankingLoading />;

  }

  /////////////////////////////////////////////////////////////
  // EMPTY
  /////////////////////////////////////////////////////////////

  if (
    !loading &&
    applications.length === 0
  ) {

    return <RankingEmpty />;

  }

  /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <div className="space-y-8">

      {/* Header */}

      <RankingHeader

        totalCandidates={
          statistics.total
        }

        averageScore={
          statistics.averageAI
        }

      />

      {/* Toolbar */}

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

        <div className="flex flex-col xl:flex-row gap-5 xl:items-center xl:justify-between">

          {/* Search */}

          <div className="relative flex-1">

            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input

              type="text"

              placeholder="Search candidate..."

              value={search}

              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }

              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-[#173E7D] outline-none"

            />

          </div>

          {/* Buttons */}

          <div className="flex flex-wrap gap-3">

            <button

              onClick={
                refreshRanking
              }

              disabled={
                refreshing
              }

              className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 transition"

            >

              <RefreshCw

                size={18}

                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }

              />

              Refresh

            </button>

            <button

              className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 transition"

            >

              <Download
                size={18}
              />

              Export

            </button>

          </div>

        </div>

      </div>

      {/* Statistics */}

      <RankingStats

        totalCandidates={
          statistics.total
        }

        averageAIScore={
          statistics.averageAI
        }

        highestAIScore={
          statistics.highestAI
        }

        preselectedCandidates={
          statistics.preselected
        }

      />

      {/* Filters */}

      <RankingFilters

        filters={filters}

        sort={sort}

        onFiltersChange={
          setFilters
        }

        onSortChange={
          setSort
        }

      />

      {/* AI Ranking Banner */}

      <div className="rounded-3xl bg-gradient-to-r from-[#173E7D] to-[#2154A6] text-white p-8 shadow-lg">

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

          <div>

            <div className="flex items-center gap-3">

              <Trophy
                size={34}
              />

              <h2 className="text-3xl font-black">

                AI Candidate Ranking

              </h2>

            </div>

            <p className="text-blue-100 mt-4 max-w-2xl">

              Candidates are automatically ranked according to
              CV analysis, AI assessment, quiz score,
              experience, skills matching and oral presentation.

            </p>

          </div>

          <div className="grid grid-cols-2 gap-6">

            <div className="text-center">

              <h3 className="text-4xl font-black">

                {statistics.total}

              </h3>

              <p className="text-blue-100">

                Candidates

              </p>

            </div>

            <div className="text-center">

              <h3 className="text-4xl font-black">

                {statistics.averageAI.toFixed(
                  1
                )}

              </h3>

              <p className="text-blue-100">

                Average AI

              </p>

            </div>

          </div>

        </div>

      </div>

      {/* Table Card */}

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

        <div className="px-8 py-6 border-b border-gray-200">

          <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-center">

            <div>

              <h2 className="text-2xl font-black text-[#173E7D]">

                Candidate Ranking

              </h2>

              <p className="text-gray-500 mt-2">

                Sorted automatically using AI score.

              </p>

            </div>

            <div className="flex items-center gap-3">

              <Filter
                size={20}
                className="text-[#173E7D]"
              />

              <span className="font-semibold text-gray-600">

                Showing

                {" "}

                {filteredApplications.length}

                {" "}

                candidate(s)

              </span>

            </div>

          </div>

        </div>
                {/* Ranking Table */}

        <RankingTable

          candidates={
            filteredApplications
          }

        />

      </div>

      {/* Top Candidates */}

      <div className="grid xl:grid-cols-3 gap-6">

        {filteredApplications

          .slice(0, 3)

          .map((candidate) => (

            <div

              key={candidate.id}

              className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6 hover:shadow-lg transition"

            >

              {/* Medal */}

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">

                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black

                    ${
                      candidate.rankingPosition === 1

                        ? "bg-yellow-500"

                        : candidate.rankingPosition === 2

                        ? "bg-gray-400"

                        : "bg-amber-700"

                    }`}
                  >

                    {candidate.rankingPosition}

                  </div>

                  <div>

                    <h3 className="font-bold text-lg">

                      {candidate.fullName}

                    </h3>

                    <p className="text-sm text-gray-500">

                      {candidate.email}

                    </p>

                  </div>

                </div>

                <Trophy

                  className="text-yellow-500"

                  size={34}

                />

              </div>

              {/* Scores */}

              <div className="grid grid-cols-2 gap-4 mt-8">

                <div>

                  <p className="text-gray-500 text-sm">

                    AI Score

                  </p>

                  <h2 className="text-3xl font-black text-[#173E7D]">

                    {candidate.aiScore}

                  </h2>

                </div>

                <div>

                  <p className="text-gray-500 text-sm">

                    Quiz

                  </p>

                  <h2 className="text-3xl font-black text-green-600">

                    {candidate.quizScore ?? "--"}

                  </h2>

                </div>

                <div>

                  <p className="text-gray-500 text-sm">

                    Experience

                  </p>

                  <h2 className="text-2xl font-bold">

                    {candidate.experienceYears}

                    {" "}yrs

                  </h2>

                </div>

                <div>

                  <p className="text-gray-500 text-sm">

                    Status

                  </p>

                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold

                    ${
                      candidate.isPreselected

                        ? "bg-green-100 text-green-700"

                        : "bg-gray-100 text-gray-700"

                    }`}
                  >

                    {candidate.isPreselected

                      ? "Preselected"

                      : "Pending"}

                  </span>

                </div>

              </div>

              {/* Actions */}

              <div className="flex flex-wrap gap-3 mt-8">

                <button

                  className="flex-1 py-3 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-[#102d5b] transition"

                >

                  View Profile

                </button>

                <button

                  className="flex-1 py-3 rounded-xl border border-[#173E7D] text-[#173E7D] font-semibold hover:bg-blue-50 transition"

                >

                  Compare

                </button>

              </div>

            </div>

          ))}

      </div>

      {/* Ranking Summary */}

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8">

        <h2 className="text-2xl font-black text-[#173E7D] mb-8">

          AI Ranking Summary

        </h2>

        <div className="grid md:grid-cols-4 gap-6">

          <div className="rounded-2xl bg-blue-50 p-6">

            <p className="text-gray-500">

              Highest Score

            </p>

            <h3 className="text-4xl font-black text-[#173E7D] mt-2">

              {statistics.highestAI}

            </h3>

          </div>

          <div className="rounded-2xl bg-green-50 p-6">

            <p className="text-gray-500">

              Average AI

            </p>

            <h3 className="text-4xl font-black text-green-600 mt-2">

              {statistics.averageAI.toFixed(1)}

            </h3>

          </div>

          <div className="rounded-2xl bg-yellow-50 p-6">

            <p className="text-gray-500">

              Preselected

            </p>

            <h3 className="text-4xl font-black text-yellow-600 mt-2">

              {statistics.preselected}

            </h3>

          </div>

          <div className="rounded-2xl bg-purple-50 p-6">

            <p className="text-gray-500">

              Applications

            </p>

            <h3 className="text-4xl font-black text-purple-700 mt-2">

              {statistics.total}

            </h3>

          </div>

        </div>

      </div>

            {/* Empty Search Results */}

      {applications.length > 0 &&
        filteredApplications.length === 0 && (

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-16 text-center">

          <Search
            size={60}
            className="mx-auto text-gray-300"
          />

          <h2 className="mt-6 text-2xl font-bold text-gray-700">

            No Candidates Found

          </h2>

          <p className="mt-3 text-gray-500">

            No candidates match the current search
            or filter criteria.

          </p>

          <button
            onClick={() => {

              setSearch("");

              setFilters(DEFAULT_FILTERS);

            }}
            className="mt-8 px-8 py-3 rounded-2xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition"
          >

            Reset Filters

          </button>

        </div>

      )}

      {/* Footer */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

        <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">

          <div>

            <h3 className="text-xl font-bold text-[#173E7D]">

              Corporate AI Ranking

            </h3>

            <p className="text-gray-500 mt-2">

              Rankings are recalculated automatically whenever
              candidate data changes.

            </p>

          </div>

          <div className="flex flex-wrap gap-4">

            <button

              onClick={refreshRanking}

              disabled={refreshing}

              className="px-6 py-3 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition disabled:opacity-60"

            >

              {refreshing

                ? "Recalculating..."

                : "Recalculate Ranking"}

            </button>

            <button

              className="px-6 py-3 rounded-xl border border-[#173E7D] text-[#173E7D] font-semibold hover:bg-blue-50 transition"

            >

              Export Excel

            </button>

            <button

              className="px-6 py-3 rounded-xl border border-[#173E7D] text-[#173E7D] font-semibold hover:bg-blue-50 transition"

            >

              Export PDF

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}
