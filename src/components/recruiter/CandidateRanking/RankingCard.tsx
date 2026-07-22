import {
  Trophy,
  Brain,
  FileText,
  Mic,
  Briefcase,
  Star,
  Eye,
} from "lucide-react";

import { CandidateRanking } from "../../../types/ranking";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingCardProps {
  candidate: CandidateRanking;

  onView?: (candidate: CandidateRanking) => void;

  onCompare?: (candidate: CandidateRanking) => void;
}

///////////////////////////////////////////////////////////////
// MEDAL
///////////////////////////////////////////////////////////////

function getMedalColor(position: number) {

  switch (position) {

    case 1:
      return "bg-yellow-500";

    case 2:
      return "bg-gray-400";

    case 3:
      return "bg-amber-700";

    default:
      return "bg-[#173E7D]";

  }

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingCard({

  candidate,

  onView,

  onCompare,

}: RankingCardProps) {

  return (

    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">

      {/* Header */}

      <div className="bg-gradient-to-r from-[#173E7D] to-[#2154A6] p-6 text-white">

        <div className="flex justify-between items-start">

          <div className="flex items-center gap-4">

            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl ${getMedalColor(candidate.rankingPosition)}`}
            >
              {candidate.rankingPosition}
            </div>

            <div>

              <h2 className="text-xl font-black">

                {candidate.fullName}

              </h2>

              <p className="text-blue-100">

                {candidate.email}

              </p>

            </div>

          </div>

          <Trophy
            size={30}
            className="text-yellow-300"
          />

        </div>

      </div>

      {/* Body */}

      <div className="p-6 space-y-6">

        {/* AI Score */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Brain
              className="text-[#173E7D]"
              size={22}
            />

            <span className="font-semibold">

              AI Score

            </span>

          </div>

          <span className="text-3xl font-black text-[#173E7D]">

            {candidate.aiScore}

          </span>

        </div>

        {/* Grid */}

        <div className="grid grid-cols-2 gap-4">

          <div className="rounded-2xl bg-blue-50 p-4">

            <div className="flex items-center gap-2">

              <FileText
                size={18}
                className="text-blue-600"
              />

              <span className="text-sm">

                Quiz

              </span>

            </div>

            <h3 className="mt-2 text-2xl font-bold">

              {candidate.quizScore ?? "--"}

            </h3>

          </div>

          <div className="rounded-2xl bg-green-50 p-4">

            <div className="flex items-center gap-2">

              <Mic
                size={18}
                className="text-green-600"
              />

              <span className="text-sm">

                Presentation

              </span>

            </div>

            <h3 className="mt-2 text-2xl font-bold">

              {candidate.presentationScore ?? "--"}

            </h3>

          </div>

          <div className="rounded-2xl bg-yellow-50 p-4">

            <div className="flex items-center gap-2">

              <Briefcase
                size={18}
                className="text-yellow-700"
              />

              <span className="text-sm">

                Experience

              </span>

            </div>

            <h3 className="mt-2 text-2xl font-bold">

              {candidate.experienceYears}

              {" "}yrs

            </h3>

          </div>

          <div className="rounded-2xl bg-purple-50 p-4">

            <div className="flex items-center gap-2">

              <Star
                size={18}
                className="text-purple-600"
              />

              <span className="text-sm">

                Status

              </span>

            </div>

            <span
              className={`inline-flex mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
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

        {/* Skills */}

        {candidate.skills?.length > 0 && (

          <div>

            <h3 className="font-semibold text-gray-700 mb-3">

              Top Skills

            </h3>

            <div className="flex flex-wrap gap-2">

              {candidate.skills.slice(0, 5).map(skill => (

                <span
                  key={skill}
                  className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm"
                >

                  {skill}

                </span>

              ))}

            </div>

          </div>

        )}

      </div>

      {/* Footer */}

      <div className="border-t border-gray-200 p-6 flex gap-3">

        <button

          onClick={() => onView?.(candidate)}

          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition"

        >

          <Eye size={18} />

          View Profile

        </button>

        <button

          onClick={() => onCompare?.(candidate)}

          className="flex-1 py-3 rounded-xl border border-[#173E7D] text-[#173E7D] font-semibold hover:bg-blue-50 transition"

        >

          Compare

        </button>

      </div>

    </div>

  );

}