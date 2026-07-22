import React from "react";

import {
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";

import {
  PreselectionCandidate,
  ReviewRequest,
} from "../../types/preselection";

import PreselectionRow from "./PreselectionRow";

export interface PreselectionTableProps {

  candidates: PreselectionCandidate[];

  onApprove: (
    request: ReviewRequest
  ) => Promise<void>;

  onReject: (
    request: ReviewRequest
  ) => Promise<void>;

  onComment: (
    request: ReviewRequest
  ) => Promise<void>;

}

const PreselectionTable: React.FC<
  PreselectionTableProps
> = ({

  candidates,

  onApprove,

  onReject,

  onComment,

}) => {

  /////////////////////////////////////////////////////////////
  // EMPTY
  /////////////////////////////////////////////////////////////

  if (!candidates.length) {

    return (

      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">

        <MessageSquare
          className="mx-auto mb-4 h-12 w-12 text-slate-300"
        />

        <h3 className="text-lg font-semibold text-slate-700">

          No Candidates

        </h3>

        <p className="mt-2 text-slate-500">

          There are currently no candidates
          available for review.

        </p>

      </div>

    );

  }

  /////////////////////////////////////////////////////////////
  // TABLE
  /////////////////////////////////////////////////////////////

  return (

    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      <div className="overflow-x-auto">

        <table className="min-w-full divide-y divide-slate-200">

          <thead className="bg-slate-50">

            <tr>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">

                #

              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">

                Candidate

              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">

                AI

              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">

                Quiz

              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">

                Presentation

              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">

                Reviewer

              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">

                Status

              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">

                Actions

              </th>

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
                        {candidates.map((candidate, index) => (

              <PreselectionRow

                key={candidate.id}

                index={index}

                candidate={candidate}

                onApprove={onApprove}

                onReject={onReject}

                onComment={onComment}

              />

            ))}

          </tbody>

        </table>

      </div>

      {/* -------------------------------------------------- */}
      {/* Footer Summary                                     */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">

        <div>

          Showing

          <span className="mx-1 font-semibold text-slate-900">

            {candidates.length}

          </span>

          candidate

          {candidates.length !== 1 && "s"}

        </div>

        <div className="flex items-center gap-6">

          <div className="flex items-center gap-2">

            <CheckCircle className="h-4 w-4 text-green-600" />

            <span>

              Approve

            </span>

          </div>

          <div className="flex items-center gap-2">

            <XCircle className="h-4 w-4 text-red-600" />

            <span>

              Reject

            </span>

          </div>

          <div className="flex items-center gap-2">

            <MessageSquare className="h-4 w-4 text-blue-600" />

            <span>

              Comment

            </span>

          </div>

        </div>

      </div>
                {/* -------------------------------------------------- */}
      {/* Mobile Cards                                       */}
      {/* -------------------------------------------------- */}

      <div className="block border-t border-slate-200 lg:hidden">

        <div className="space-y-4 p-4">

          {candidates.map((candidate, index) => (

            <div
              key={`mobile-${candidate.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >

              <div className="mb-4 flex items-start justify-between">

                <div>

                  <h3 className="font-semibold text-slate-900">

                    {candidate.fullName}

                  </h3>

                  <p className="text-sm text-slate-500">

                    {candidate.email}

                  </p>

                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">

                  #{index + 1}

                </span>

              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">

                <div>

                  <span className="text-slate-500">

                    AI Score

                  </span>

                  <div className="font-semibold">

                    {candidate.aiScore}

                  </div>

                </div>

                <div>

                  <span className="text-slate-500">

                    Quiz

                  </span>

                  <div className="font-semibold">

                    {candidate.quizScore ?? "-"}

                  </div>

                </div>

                <div>

                  <span className="text-slate-500">

                    Presentation

                  </span>

                  <div className="font-semibold">

                    {candidate.presentationScore ?? "-"}

                  </div>

                </div>

                <div>

                  <span className="text-slate-500">

                    Reviewer

                  </span>

                  <div className="font-semibold">

                    {candidate.preselectedBy ?? "-"}

                  </div>

                </div>

              </div>

              <div className="mt-5">

                <PreselectionRow

                  index={index}

                  candidate={candidate}

                  onApprove={onApprove}

                  onReject={onReject}

                  onComment={onComment}

                />

              </div>

            </div>

          ))}

        </div>

      </div>
          </div>

  );

};

export default PreselectionTable;