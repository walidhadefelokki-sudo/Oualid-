import React from "react";

interface PreselectionLoadingProps {
  rows?: number;
}

const PreselectionLoading: React.FC<PreselectionLoadingProps> = ({
  rows = 6,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-52 animate-pulse rounded bg-slate-200" />

          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-7 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="h-4 animate-pulse rounded bg-slate-300"
          />
        ))}
      </div>

      {/* Rows */}
      <div>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-7 items-center gap-4 border-b border-slate-100 px-6 py-5 last:border-b-0"
          >
            {/* Candidate */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />

              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            {/* Score */}
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />

            {/* Experience */}
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />

            {/* Status */}
            <div className="flex">
              <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200" />
            </div>

            {/* Reviewer */}
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />

            {/* Date */}
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />

            {/* Actions */}
            <div className="flex gap-2">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreselectionLoading;