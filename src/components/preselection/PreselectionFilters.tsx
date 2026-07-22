import React from "react";
import { Search, RotateCcw } from "lucide-react";

import {
  PreselectionFilters as PreselectionFiltersType,
  PreselectionStatus,
} from "../../types/preselection";

import {
  PRESELECTION_STATUSES,
} from "../../constants/preselection";

export interface PreselectionFiltersProps {

  filters: PreselectionFiltersType;

  onChange: (
    filters: Partial<PreselectionFiltersType>
  ) => void;

  onReset: () => void;

}

const PreselectionFilters: React.FC<
  PreselectionFiltersProps
> = ({

  filters,

  onChange,

  onReset,

}) => {

  /////////////////////////////////////////////////////////////
  // SEARCH
  /////////////////////////////////////////////////////////////

  const handleSearch = (

    event: React.ChangeEvent<HTMLInputElement>

  ) => {

    onChange({

      search: event.target.value,

    });

  };

  /////////////////////////////////////////////////////////////
  // STATUS
  /////////////////////////////////////////////////////////////

  const handleStatus = (

    event: React.ChangeEvent<HTMLSelectElement>

  ) => {

    onChange({

      status:

        event.target.value as
        PreselectionStatus | "",

    });

  };

  /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-5">

        {/* ------------------------------------------------ */}
        {/* Search                                           */}
        {/* ------------------------------------------------ */}

        <div className="xl:col-span-2">

          <label className="mb-2 block text-sm font-medium text-slate-700">

            Search Candidate

          </label>

          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={filters.search}
              onChange={handleSearch}
              placeholder="Name, email, skills..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />

          </div>

        </div>

        {/* ------------------------------------------------ */}
        {/* Status                                           */}
        {/* ------------------------------------------------ */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">

            Status

          </label>

          <select
            value={filters.status}
            onChange={handleStatus}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >

            <option value="">

              All Statuses

            </option>

            {PRESELECTION_STATUSES.map(status => (

              <option
                key={status.value}
                value={status.value}
              >

                {status.label}

              </option>

            ))}

          </select>

        </div>
                {/* ------------------------------------------------ */}
        {/* Reviewer                                         */}
        {/* ------------------------------------------------ */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">

            Reviewer

          </label>

          <input
            type="text"
            value={filters.reviewer}
            onChange={(event) =>
              onChange({
                reviewer: event.target.value,
              })
            }
            placeholder="Reviewer name..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

        </div>

        {/* ------------------------------------------------ */}
        {/* Minimum AI Score                                 */}
        {/* ------------------------------------------------ */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">

            Minimum AI Score

          </label>

          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={filters.minimumAIScore}
            onChange={(event) =>
              onChange({
                minimumAIScore:
                  Number(event.target.value) || 0,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

        </div>

      </div>

      {/* -------------------------------------------------- */}
      {/* Second Row                                         */}
      {/* -------------------------------------------------- */}

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div className="w-full lg:max-w-sm">

          <label className="mb-2 block text-sm font-medium text-slate-700">

            Location

          </label>

          <input
            type="text"
            value={filters.location}
            onChange={(event) =>
              onChange({
                location: event.target.value,
              })
            }
            placeholder="City or Country..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

        </div>

        <div className="flex items-center justify-end gap-3">

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >

            <RotateCcw className="h-4 w-4" />

            Reset Filters

          </button>

        </div>

      </div>
          </div>

  );

};

export default PreselectionFilters;