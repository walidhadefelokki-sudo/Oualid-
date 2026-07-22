import React, { useState } from "react";

import {
  Check,
  X,
  MessageSquare,
  FileText,
  Video,
  User,
} from "lucide-react";

import {
  PreselectionCandidate,
  ReviewRequest,
} from "../../types/preselection";

import {
  getAIScoreColor,
  getStatusColor,
  getStatusLabel,
} from "../../utils/preselectionHelpers";

export interface PreselectionRowProps {

  candidate: PreselectionCandidate;

  index: number;

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

const PreselectionRow: React.FC<
  PreselectionRowProps
> = ({

  candidate,

  index,

  onApprove,

  onReject,

  onComment,

}) => {

  /////////////////////////////////////////////////////////////
  // STATE
  /////////////////////////////////////////////////////////////

  const [comment, setComment] = useState(

    candidate.preselectionComment ?? ""

  );

  const [loading, setLoading] =

    useState(false);

  /////////////////////////////////////////////////////////////
  // APPROVE
  /////////////////////////////////////////////////////////////

  const handleApprove = async () => {

    try {

      setLoading(true);

      await onApprove({

        applicationId:

          candidate.applicationId,

        action: "approve",

        comment,

      });

    } finally {

      setLoading(false);

    }

  };

  /////////////////////////////////////////////////////////////
  // REJECT
  /////////////////////////////////////////////////////////////

  const handleReject = async () => {

    try {

      setLoading(true);

      await onReject({

        applicationId:

          candidate.applicationId,

        action: "reject",

        comment,

      });

    } finally {

      setLoading(false);

    }

  };

  /////////////////////////////////////////////////////////////
  // COMMENT
  /////////////////////////////////////////////////////////////

  const handleSaveComment = async () => {

    try {

      setLoading(true);

      await onComment({

        applicationId:

          candidate.applicationId,

        action: "comment",

        comment,

      });

    } finally {

      setLoading(false);

    }

  };

  /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <tr className="transition hover:bg-slate-50">

      {/* Rank */}

      <td className="px-6 py-4 text-sm font-semibold text-slate-700">

        #{index + 1}

      </td>

      {/* Candidate */}

      <td className="px-6 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">

            {candidate.avatar ? (

              <img
                src={candidate.avatar}
                alt={candidate.fullName}
                className="h-11 w-11 rounded-full object-cover"
              />

            ) : (

              <User className="h-5 w-5 text-slate-500" />

            )}

          </div>

          <div>

            <div className="font-semibold text-slate-900">

              {candidate.fullName}

            </div>

            <div className="text-sm text-slate-500">

              {candidate.email}

            </div>

            {candidate.title && (

              <div className="text-xs text-slate-400">

                {candidate.title}

              </div>

            )}

          </div>

        </div>

      </td>
            {/* AI Score */}

      <td className="px-6 py-4 text-center">

        <span
          className={`font-bold ${getAIScoreColor(
            candidate.aiScore
          )}`}
        >
          {candidate.aiScore}
        </span>

      </td>

      {/* Quiz Score */}

      <td className="px-6 py-4 text-center">

        <span className="font-medium text-slate-700">

          {candidate.quizScore ?? "-"}

        </span>

      </td>

      {/* Presentation Score */}

      <td className="px-6 py-4 text-center">

        <div className="flex items-center justify-center gap-2">

          <Video className="h-4 w-4 text-slate-400" />

          <span className="font-medium text-slate-700">

            {candidate.presentationScore ?? "-"}

          </span>

        </div>

      </td>

      {/* Reviewer */}

      <td className="px-6 py-4 text-center">

        {candidate.preselectedBy ? (

          <div>

            <div className="font-medium text-slate-900">

              {candidate.preselectedBy}

            </div>

            {candidate.preselectedAt && (

              <div className="text-xs text-slate-500">

                {new Date(
                  candidate.preselectedAt
                ).toLocaleDateString()}

              </div>

            )}

          </div>

        ) : (

          <span className="text-slate-400">

            —

          </span>

        )}

      </td>

      {/* Status */}

      <td className="px-6 py-4 text-center">

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
            candidate.status
          )}`}
        >

          {getStatusLabel(

            candidate.status

          )}

        </span>

      </td>

      {/* Actions */}

      <td className="px-6 py-4">

        <div className="flex items-center justify-center gap-2">
                      <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 p-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Approve Candidate"
          >

            <Check className="h-4 w-4" />

          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Reject Candidate"
          >

            <X className="h-4 w-4" />

          </button>

          <button
            type="button"
            onClick={handleSaveComment}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Save Comment"
          >

            <MessageSquare className="h-4 w-4" />

          </button>

          {candidate.cvUrl && (

            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
              title="View CV"
            >

              <FileText className="h-4 w-4" />

            </a>

          )}

        </div>

        <div className="mt-3">

          <textarea
            value={comment}
            onChange={(event) =>

              setComment(

                event.target.value

              )

            }
            rows={2}
            placeholder="Write a review comment..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

        </div>

      </td>
          </tr>

  );

};

export default PreselectionRow;