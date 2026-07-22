import React from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";

import {
  PreselectionHistory as HistoryItem,
} from "../../types/preselection";

import {
  formatDate,
} from "../../utils/preselectionHelpers";

interface PreselectionHistoryProps {
  history: HistoryItem[];
  loading?: boolean;
}

const getActionIcon = (action: HistoryItem["action"]) => {
  switch (action) {
    case "approve":
      return (
        <CheckCircle className="h-5 w-5 text-green-600" />
      );

    case "reject":
      return (
        <XCircle className="h-5 w-5 text-red-600" />
      );

    case "comment":
      return (
        <MessageSquare className="h-5 w-5 text-blue-600" />
      );

    default:
      return (
        <Clock className="h-5 w-5 text-slate-500" />
      );
  }
};

const getActionLabel = (
  action: HistoryItem["action"]
) => {
  switch (action) {
    case "approve":
      return "Approved";

    case "reject":
      return "Rejected";

    case "comment":
      return "Comment Added";

    default:
      return action;
  }
};

const PreselectionHistory: React.FC<
  PreselectionHistoryProps
> = ({
  history,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 h-6 w-44 animate-pulse rounded bg-slate-200" />

        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5 text-indigo-600" />

        <h2 className="text-lg font-semibold text-slate-900">
          Review History
        </h2>
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center">

          <Clock className="mx-auto mb-3 h-10 w-10 text-slate-300" />

          <p className="text-slate-500">
            No review history available.
          </p>

        </div>
      ) : (
        <div className="relative">

          <div className="absolute bottom-0 left-[10px] top-0 w-px bg-slate-200" />

          <div className="space-y-6">

            {history.map((item) => (
              <div
                key={item.id}
                className="relative flex gap-4"
              >

                <div className="relative z-10 rounded-full bg-white">
                  {getActionIcon(item.action)}
                </div>

                <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-4">

                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                    <div>

                      <h3 className="font-semibold text-slate-900">
                        {getActionLabel(item.action)}
                      </h3>

                      <p className="text-sm text-slate-500">
                        By{" "}
                        <span className="font-medium">
                          {item.reviewer}
                        </span>
                      </p>

                    </div>

                    <span className="text-sm text-slate-500">
                      {formatDate(item.createdAt)}
                    </span>

                  </div>

                  {item.comment && (
                    <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
                      {item.comment}
                    </div>
                  )}

                </div>

              </div>
            ))}

          </div>

        </div>
      )}

    </div>
  );
};

export default PreselectionHistory;