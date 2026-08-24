import {
  Trophy,
  Medal,
  Brain,
  FileText,
  Mic,
  Briefcase,
  Eye,
  Scale,
  Download,
  CheckCircle2,
} from "lucide-react";

import {
  CandidateRanking,
} from "../../../types/ranking";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingRowProps {

  candidate: CandidateRanking;

  onView?: () => void;

  onCompare?: () => void;

  onDownloadCV?: () => void;

  onPreselect?: () => void;

}

///////////////////////////////////////////////////////////////
// MEDAL
///////////////////////////////////////////////////////////////

function RankingMedal({

  position,

}: {

  position: number;

}) {

  switch (position) {

    case 1:

      return (

        <Trophy

          size={24}

          className="text-yellow-500"

        />

      );

    case 2:

      return (

        <Medal

          size={24}

          className="text-gray-400"

        />

      );

    case 3:

      return (

        <Medal

          size={24}

          className="text-amber-700"

        />

      );

    default:

      return (

        <span className="font-bold text-gray-500">

          #{position}

        </span>

      );

  }

}

///////////////////////////////////////////////////////////////
// SCORE BADGE
///////////////////////////////////////////////////////////////

function ScoreBadge({

  score,

  color,

}: {

  score: number | null | undefined;

  color:
    | "blue"
    | "green"
    | "yellow";

}) {

  const classes = {

    blue:

      "bg-blue-100 text-blue-700",

    green:

      "bg-green-100 text-green-700",

    yellow:

      "bg-yellow-100 text-yellow-700",

  };

  return (

    <span
      className={`inline-flex items-center justify-center min-w-[64px] px-3 py-2 rounded-xl font-bold ${classes[color]}`}
    >

      {score ?? "--"}

    </span>

  );

}

///////////////////////////////////////////////////////////////
// STATUS BADGE
///////////////////////////////////////////////////////////////

function StatusBadge({

  preselected,

}: {

  preselected: boolean;

}) {

  if (preselected) {

    return (

      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">

        <CheckCircle2

          size={16}

        />

        Preselected

      </span>

    );

  }

  return (

    <span className="inline-flex px-3 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold">

      Pending

    </span>

  );

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingRow({

  candidate,

  onView,

  onCompare,

  onDownloadCV,

  onPreselect,

}: RankingRowProps) {

  return (

    <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200">
              {/* Ranking */}

      <td className="px-6 py-5">

        <div className="flex items-center justify-center">

          <RankingMedal

            position={candidate.rankingPosition}

          />

        </div>

      </td>

      {/* Candidate */}

      <td className="px-6 py-5">

        <div className="flex items-center gap-4">

          {/* Avatar */}

          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#173E7D] to-[#2154A6] text-white flex items-center justify-center text-lg font-black">

            {candidate.fullName
              .split(" ")
              .map(name => name[0])
              .slice(0, 2)
              .join("")}

          </div>

          {/* Information */}

          <div>

            <h3 className="font-bold text-gray-800">

              {candidate.fullName}

            </h3>

            <p className="text-sm text-gray-500">

              {candidate.email}

            </p>

            {candidate.location && (

              <p className="text-xs text-gray-400 mt-1">

                📍 {candidate.location}

              </p>

            )}

          </div>

        </div>

      </td>

      {/* AI Score */}

      <td className="px-6 py-5 text-center">

        <div className="flex flex-col items-center gap-2">

          <Brain
            size={18}
            className="text-[#173E7D]"
          />

          <ScoreBadge

            score={candidate.aiScore}

            color="blue"

          />

        </div>

      </td>

      {/* Quiz Score */}

      <td className="px-6 py-5 text-center">

        <div className="flex flex-col items-center gap-2">

          <FileText
            size={18}
            className="text-green-600"
          />

          <ScoreBadge

            score={candidate.quizScore}

            color="green"

          />

        </div>

      </td>

      {/* Presentation */}

      <td className="px-6 py-5 text-center">

        <div className="flex flex-col items-center gap-2">

          <Mic
            size={18}
            className="text-yellow-600"
          />

          <ScoreBadge

            score={candidate.presentationScore}

            color="yellow"

          />

        </div>

      </td>

      {/* Experience */}

      <td className="px-6 py-5 text-center">

        <div className="flex flex-col items-center gap-2">

          <Briefcase
            size={18}
            className="text-gray-600"
          />

          <span className="font-bold text-lg">

            {candidate.experienceYears}

          </span>

          <span className="text-xs text-gray-500">

            years

          </span>

        </div>

      </td>

      {/* Status */}

      <td className="px-6 py-5 text-center">

        <StatusBadge

          preselected={candidate.isPreselected}

        />

      </td>

      {/* Actions */}

      <td className="px-6 py-5">

        <div className="flex items-center justify-center gap-2">
                      {/* View */}

          <button

            onClick={onView}

            title="View Candidate"

            className="w-10 h-10 rounded-xl bg-[#173E7D] text-white flex items-center justify-center hover:bg-[#123263] transition"

          >

            <Eye size={18} />

          </button>

          {/* Compare */}

          <button

            onClick={onCompare}

            title="Compare Candidate"

            className="w-10 h-10 rounded-xl border border-[#173E7D] text-[#173E7D] flex items-center justify-center hover:bg-blue-50 transition"

          >

            <Scale size={18} />

          </button>

          {/* Download CV */}

          <button

            onClick={onDownloadCV}

            title="Download CV"

            className="w-10 h-10 rounded-xl border border-green-600 text-green-600 flex items-center justify-center hover:bg-green-50 transition"

          >

            <Download size={18} />

          </button>

          {/* Preselect */}

          {!candidate.isPreselected && (

            <button

              onClick={onPreselect}

              title="Preselect Candidate"

              className="px-4 h-10 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition whitespace-nowrap"

            >

              Preselect

            </button>

          )}

        </div>

      </td>

    </tr>

  );

}