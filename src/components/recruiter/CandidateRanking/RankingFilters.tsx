import { useState } from "react";

import {
  Filter,
  RotateCcw,
} from "lucide-react";

import {
  RankingFilters as RankingFiltersType,
  RankingSort,
} from "../../../types/ranking";

import {
  DEFAULT_FILTERS,
} from "../../../constants/ranking";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingFiltersProps {

  filters: RankingFiltersType;

  sort: RankingSort;

  onFiltersChange: (
    filters: RankingFiltersType
  ) => void;

  onSortChange: (
    sort: RankingSort
  ) => void;

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingFilters({

  filters,

  sort,

  onFiltersChange,

  onSortChange,

}: RankingFiltersProps) {

  /////////////////////////////////////////////////////////////
  // STATE
  /////////////////////////////////////////////////////////////

  const [expanded, setExpanded] =
    useState(false);

  /////////////////////////////////////////////////////////////
  // UPDATE FILTER
  /////////////////////////////////////////////////////////////

  function updateFilter<

    K extends keyof RankingFiltersType

  >(

    key: K,

    value: RankingFiltersType[K]

  ) {

    onFiltersChange({

      ...filters,

      [key]: value,

    });

  }

  /////////////////////////////////////////////////////////////
  // RESET
  /////////////////////////////////////////////////////////////

  function resetFilters() {

    onFiltersChange(

      DEFAULT_FILTERS

    );

  }

  /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-gray-200">

        <div className="flex items-center gap-3">

          <Filter

            size={24}

            className="text-[#173E7D]"

          />

          <div>

            <h2 className="text-xl font-black text-[#173E7D]">

              Ranking Filters

            </h2>

            <p className="text-gray-500 text-sm">

              Filter and sort recruiter results.

            </p>

          </div>

        </div>

        <div className="flex items-center gap-3">

          <button

            onClick={resetFilters}

            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition"

          >

            <RotateCcw size={18} />

            Reset

          </button>

          <button

            onClick={() =>

              setExpanded(

                !expanded

              )

            }

            className="px-5 py-2 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition"

          >

            {

              expanded

                ? "Hide Filters"

                : "Show Filters"

            }

          </button>

        </div>

      </div>

      {/* Filters */}

      {expanded && (

        <div className="p-8 space-y-8">
                      {/* First Row */}

          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">

            {/* Minimum AI Score */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Minimum AI Score

              </label>

              <input

                type="number"

                min={0}

                max={100}

                value={filters.minimumAIScore}

                onChange={(e) =>

                  updateFilter(

                    "minimumAIScore",

                    Number(e.target.value)

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              />

            </div>

            {/* Minimum Quiz Score */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Minimum Quiz Score

              </label>

              <input

                type="number"

                min={0}

                max={100}

                value={filters.minimumQuizScore}

                onChange={(e) =>

                  updateFilter(

                    "minimumQuizScore",

                    Number(e.target.value)

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              />

            </div>

            {/* Experience */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Minimum Experience

              </label>

              <input

                type="number"

                min={0}

                value={filters.minimumExperience}

                onChange={(e) =>

                  updateFilter(

                    "minimumExperience",

                    Number(e.target.value)

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              />

            </div>

            {/* Sort */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Sort By

              </label>

              <select

                value={sort}

                onChange={(e) =>

                  onSortChange(

                    e.target.value as RankingSort

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              >

                <option value="ai">

                  AI Score

                </option>

                <option value="quiz">

                  Quiz Score

                </option>

                <option value="experience">

                  Experience

                </option>

                <option value="alphabetical">

                  Alphabetical

                </option>

                <option value="newest">

                  Newest

                </option>

              </select>

            </div>

          </div>

          {/* Second Row */}

          <div className="grid lg:grid-cols-3 gap-6">

            {/* Status */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Candidate Status

              </label>

              <select

                value={filters.status}

                onChange={(e) =>

                  updateFilter(

                    "status",

                    e.target.value

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              >

                <option value="">

                  All Statuses

                </option>

                <option value="PENDING">

                  Pending

                </option>

                <option value="REVIEWING">

                  Reviewing

                </option>

                <option value="SHORTLISTED">

                  Shortlisted

                </option>

                <option value="INTERVIEW">

                  Interview

                </option>

                <option value="HIRED">

                  Hired

                </option>

                <option value="REJECTED">

                  Rejected

                </option>

              </select>

            </div>

            {/* Skill */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Required Skill

              </label>

              <input

                type="text"

                placeholder="React, Node.js..."

                value={filters.skill}

                onChange={(e) =>

                  updateFilter(

                    "skill",

                    e.target.value

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              />

            </div>

            {/* Wilaya */}

            <div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">

                Wilaya

              </label>

              <input

                type="text"

                placeholder="Oran"

                value={filters.location}

                onChange={(e) =>

                  updateFilter(

                    "location",

                    e.target.value

                  )

                }

                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-[#173E7D] outline-none"

              />

            </div>

          </div>

          {/* Third Row */}

          <div className="grid md:grid-cols-2 gap-6">

            {/* Preselected */}

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 p-5 cursor-pointer hover:bg-gray-50 transition">

              <input

                type="checkbox"

                checked={filters.preselectedOnly}

                onChange={(e) =>

                  updateFilter(

                    "preselectedOnly",

                    e.target.checked

                  )

                }

                className="w-5 h-5"

              />

              <div>

                <h3 className="font-semibold">

                  Show only preselected candidates

                </h3>

                <p className="text-sm text-gray-500">

                  Hide candidates that haven't been preselected.

                </p>

              </div>

            </label>

            {/* Remote */}

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 p-5 cursor-pointer hover:bg-gray-50 transition">

              <input

                type="checkbox"

                checked={filters.remoteOnly}

                onChange={(e) =>

                  updateFilter(

                    "remoteOnly",

                    e.target.checked

                  )

                }

                className="w-5 h-5"

              />

              <div>

                <h3 className="font-semibold">

                  Remote Candidates Only

                </h3>

                <p className="text-sm text-gray-500">

                  Display candidates available for remote work.

                </p>

              </div>

            </label>

          </div>
          
        </div>
                  {/* Active Filters */}

          <div>

            <h3 className="text-lg font-bold text-[#173E7D] mb-4">

              Active Filters

            </h3>

            <div className="flex flex-wrap gap-3">

              {filters.minimumAIScore > 0 && (

                <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">

                  AI ≥ {filters.minimumAIScore}

                </span>

              )}

              {filters.minimumQuizScore > 0 && (

                <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">

                  Quiz ≥ {filters.minimumQuizScore}

                </span>

              )}

              {filters.minimumExperience > 0 && (

                <span className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">

                  Experience ≥ {filters.minimumExperience} yrs

                </span>

              )}

              {filters.skill && (

                <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">

                  Skill: {filters.skill}

                </span>

              )}

              {filters.location && (

                <span className="px-4 py-2 rounded-full bg-pink-100 text-pink-700 text-sm font-medium">

                  {filters.location}

                </span>

              )}

              {filters.status && (

                <span className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">

                  {filters.status}

                </span>

              )}

              {filters.preselectedOnly && (

                <span className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">

                  Preselected

                </span>

              )}

              {filters.remoteOnly && (

                <span className="px-4 py-2 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium">

                  Remote

                </span>

              )}

              {filters.minimumAIScore === 0 &&
               filters.minimumQuizScore === 0 &&
               filters.minimumExperience === 0 &&
               !filters.skill &&
               !filters.location &&
               !filters.status &&
               !filters.preselectedOnly &&
               !filters.remoteOnly && (

                <span className="text-gray-500">

                  No active filters.

                </span>

              )}

            </div>

          </div>

          {/* Footer */}

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between gap-4 items-center">

            <div>

              <p className="text-sm text-gray-500">

                Filters are applied automatically.

              </p>

            </div>

            <div className="flex gap-3">

              <button

                onClick={resetFilters}

                className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition"

              >

                Clear Filters

              </button>

              <button

                onClick={() =>

                  setExpanded(false)

                }

                className="px-8 py-3 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition"

              >

                Apply Filters

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}
        