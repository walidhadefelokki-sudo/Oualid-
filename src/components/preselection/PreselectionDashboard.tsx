import React, { useMemo } from "react";

import {
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { usePreselection } from "../../hooks/usePreselection";

import PreselectionStats from "./PreselectionStats";
import PreselectionFilters from "./PreselectionFilters";
import PreselectionTable from "./PreselectionTable";
import PreselectionLoading from "./PreselectionLoading";
import PreselectionEmpty from "./PreselectionEmpty";

import {
  PAGE_SIZE,
  LOADING_MESSAGE,
  EMPTY_MESSAGE,
} from "../../constants/preselection";

const PreselectionDashboard: React.FC = () => {

  /////////////////////////////////////////////////////////////
  // HOOK
  /////////////////////////////////////////////////////////////

  const {

    paginatedCandidates,

    filteredCandidates,

    statistics,

    filters,

    loading,

    error,

    page,

    pageSize,

    totalPages,

    setPage,

    setPageSize,

    updateFilters,

    resetFilters,

    refresh,

    approveCandidate,

    rejectCandidate,

    saveComment,

  } = usePreselection();

  /////////////////////////////////////////////////////////////
  // DASHBOARD COUNTERS
  /////////////////////////////////////////////////////////////

  const dashboardCards = useMemo(() => {

    return [

      {

        title: "Pending",

        value:

          statistics?.pending ??

          0,

        icon: Clock,

        color:

          "bg-yellow-100 text-yellow-700",

      },

      {

        title: "Approved",

        value:

          statistics?.approved ??

          0,

        icon: CheckCircle,

        color:

          "bg-green-100 text-green-700",

      },

      {

        title: "Rejected",

        value:

          statistics?.rejected ??

          0,

        icon: XCircle,

        color:

          "bg-red-100 text-red-700",

      },

      {

        title: "Candidates",

        value:

          filteredCandidates.length,

        icon: Users,

        color:

          "bg-blue-100 text-blue-700",

      },

    ];

  }, [

    statistics,

    filteredCandidates,

  ]);

  /////////////////////////////////////////////////////////////
  // REFRESH
  /////////////////////////////////////////////////////////////

  const handleRefresh = async () => {

    await refresh();

  };

  /////////////////////////////////////////////////////////////
  // PAGE SIZE
  /////////////////////////////////////////////////////////////

  const handlePageSizeChange = (

    event: React.ChangeEvent<HTMLSelectElement>

  ) => {

    setPageSize(

      Number(event.target.value)

    );

    setPage(1);

  };

  /////////////////////////////////////////////////////////////
  // PAGE CHANGE
  /////////////////////////////////////////////////////////////

  const handlePrevious = () => {

    if (page > 1) {

      setPage(page - 1);

    }

  };

  const handleNext = () => {

    if (page < totalPages) {

      setPage(page + 1);

    }

  };
    /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <div className="space-y-6">

      {/* -------------------------------------------------- */}
      {/* Header                                             */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">

            Preselection Dashboard

          </h1>

          <p className="mt-1 text-slate-500">

            Review AI-ranked candidates before sharing them
            with recruiters.

          </p>

        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >

          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh

        </button>

      </div>

      {/* -------------------------------------------------- */}
      {/* Error                                              */}
      {/* -------------------------------------------------- */}

      {error && (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

          {error}

        </div>

      )}

      {/* -------------------------------------------------- */}
      {/* Statistics                                         */}
      {/* -------------------------------------------------- */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {dashboardCards.map(card => (

          <PreselectionStats

            key={card.title}

            title={card.title}

            value={card.value}

            icon={card.icon}

            color={card.color}

          />

        ))}

      </div>

      {/* -------------------------------------------------- */}
      {/* Filters                                            */}
      {/* -------------------------------------------------- */}

      <PreselectionFilters

        filters={filters}

        onChange={updateFilters}

        onReset={resetFilters}

      />

      {/* -------------------------------------------------- */}
      {/* Toolbar                                            */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h2 className="text-lg font-semibold">

            Candidates

          </h2>

          <p className="text-sm text-slate-500">

            {filteredCandidates.length} candidate

            {filteredCandidates.length !== 1 && "s"}

            {" "}found

          </p>

        </div>

        <div className="flex items-center gap-3">

          <label className="text-sm text-slate-500">

            Rows

          </label>

          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >

            {[10, 25, 50, 100].map(size => (

              <option
                key={size}
                value={size}
              >

                {size}

              </option>

            ))}

          </select>

        </div>

      </div>
            {/* -------------------------------------------------- */}
      {/* Loading                                            */}
      {/* -------------------------------------------------- */}

      {loading ? (

        <PreselectionLoading

          message={LOADING_MESSAGE}

        />

      ) : filteredCandidates.length === 0 ? (

        /* ---------------------------------------------- */
        /* Empty                                          */
        /* ---------------------------------------------- */

        <PreselectionEmpty

          message={EMPTY_MESSAGE}

        />

      ) : (

        /* ---------------------------------------------- */
        /* Table                                          */
        /* ---------------------------------------------- */

        <PreselectionTable

          candidates={paginatedCandidates}

          onApprove={approveCandidate}

          onReject={rejectCandidate}

          onComment={saveComment}

        />

      )}

      {/* -------------------------------------------------- */}
      {/* Pagination                                         */}
      {/* -------------------------------------------------- */}

      {!loading &&

        filteredCandidates.length > 0 && (

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">

          <div className="text-sm text-slate-500">

            Showing{" "}

            <span className="font-medium text-slate-700">

              {(page - 1) * pageSize + 1}

            </span>

            {" "}to{" "}

            <span className="font-medium text-slate-700">

              {Math.min(

                page * pageSize,

                filteredCandidates.length

              )}

            </span>

            {" "}of{" "}

            <span className="font-medium text-slate-700">

              {filteredCandidates.length}

            </span>

            {" "}candidate

            {filteredCandidates.length !== 1 && "s"}

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={handlePrevious}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >

              Previous

            </button>

            <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold">

              Page {page} / {totalPages}

            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >

              Next

            </button>

          </div>

        </div>

      )}
          </div>

  );

};

export default PreselectionDashboard;