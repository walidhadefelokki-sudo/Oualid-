import {
  Trophy,
  Medal,
  Brain,
  FileText,
  Mic,
  Briefcase,
  Eye,
  Scale,
} from "lucide-react";

import RankingRow from "./RankingRow";

import {
  CandidateRanking,
} from "../../../types/ranking";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingTableProps {

  candidates: CandidateRanking[];

  onViewCandidate?: (
    candidate: CandidateRanking
  ) => void;

  onCompareCandidate?: (
    candidate: CandidateRanking
  ) => void;

}

///////////////////////////////////////////////////////////////
// MEDAL
///////////////////////////////////////////////////////////////

function MedalIcon({

  position,

}: {

  position: number;

}) {

  if (position === 1) {

    return (

      <Trophy

        size={22}

        className="text-yellow-500"

      />

    );

  }

  if (position === 2) {

    return (

      <Medal

        size={22}

        className="text-gray-400"

      />

    );

  }

  if (position === 3) {

    return (

      <Medal

        size={22}

        className="text-amber-700"

      />

    );

  }

  return (

    <span className="font-bold text-gray-500">

      #{position}

    </span>

  );

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingTable({

  candidates,

  onViewCandidate,

  onCompareCandidate,

}: RankingTableProps) {

  /////////////////////////////////////////////////////////////
  // EMPTY
  /////////////////////////////////////////////////////////////

  if (candidates.length === 0) {

    return (

      <div className="py-24 text-center">

        <Brain

          size={56}

          className="mx-auto text-gray-300"

        />

        <h2 className="mt-6 text-2xl font-bold text-gray-700">

          No Candidates

        </h2>

        <p className="mt-3 text-gray-500">

          There are no candidates to display.

        </p>

      </div>

    );

  }

  /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <>

      {/* Desktop */}

      <div className="hidden xl:block overflow-x-auto">

        <table className="w-full">

          <thead>

            <tr className="border-b border-gray-200 bg-gray-50">

              {/* Rank */}

              <th className="text-left px-6 py-5 font-bold text-gray-700">

                Rank

              </th>

              {/* Candidate */}

              <th className="text-left px-6 py-5 font-bold text-gray-700">

                Candidate

              </th>

              {/* AI */}

              <th className="text-center px-6 py-5 font-bold text-gray-700">

                <div className="flex justify-center items-center gap-2">

                  <Brain size={18} />

                  AI Score

                </div>

              </th>

              {/* Quiz */}

              <th className="text-center px-6 py-5 font-bold text-gray-700">

                <div className="flex justify-center items-center gap-2">

                  <FileText size={18} />

                  Quiz

                </div>

              </th>

              {/* Presentation */}

              <th className="text-center px-6 py-5 font-bold text-gray-700">

                <div className="flex justify-center items-center gap-2">

                  <Mic size={18} />

                  Presentation

                </div>

              </th>

              {/* Experience */}

              <th className="text-center px-6 py-5 font-bold text-gray-700">

                <div className="flex justify-center items-center gap-2">

                  <Briefcase size={18} />

                  Experience

                </div>

              </th>

              {/* Status */}

              <th className="text-center px-6 py-5 font-bold text-gray-700">

                Status

              </th>

              {/* Actions */}

              <th className="text-center px-6 py-5 font-bold text-gray-700">

                <div className="flex justify-center items-center gap-2">

                  <Eye size={18} />

                  Actions

                </div>

              </th>

            </tr>

          </thead>

          <tbody>
                        {candidates.map((candidate) => (

              <RankingRow

                key={candidate.id}

                candidate={candidate}

                onView={() =>

                  onViewCandidate?.(

                    candidate

                  )

                }

                onCompare={() =>

                  onCompareCandidate?.(

                    candidate

                  )

                }

              />

            ))}

          </tbody>

        </table>

      </div>

      {/* Mobile */}

      <div className="xl:hidden space-y-6">

        {candidates.map((candidate) => (

          <div

            key={candidate.id}

            className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden"

          >

            {/* Header */}

            <div className="bg-gradient-to-r from-[#173E7D] to-[#2154A6] p-5 text-white">

              <div className="flex justify-between items-center">

                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">

                    <MedalIcon

                      position={

                        candidate.rankingPosition

                      }

                    />

                  </div>

                  <div>

                    <h2 className="font-bold text-lg">

                      {candidate.fullName}

                    </h2>

                    <p className="text-blue-100 text-sm">

                      {candidate.email}

                    </p>

                  </div>

                </div>

                <div className="text-right">

                  <p className="text-xs text-blue-100">

                    AI Score

                  </p>

                  <h3 className="text-3xl font-black">

                    {candidate.aiScore}

                  </h3>

                </div>

              </div>

            </div>

            {/* Body */}

            <div className="p-6">

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-blue-50 p-4">

                  <div className="flex items-center gap-2 text-blue-700">

                    <FileText size={18} />

                    <span className="text-sm">

                      Quiz

                    </span>

                  </div>

                  <h3 className="mt-2 text-2xl font-bold">

                    {candidate.quizScore ?? "--"}

                  </h3>

                </div>

                <div className="rounded-xl bg-green-50 p-4">

                  <div className="flex items-center gap-2 text-green-700">

                    <Mic size={18} />

                    <span className="text-sm">

                      Presentation

                    </span>

                  </div>

                  <h3 className="mt-2 text-2xl font-bold">

                    {candidate.presentationScore ?? "--"}

                  </h3>

                </div>

                <div className="rounded-xl bg-yellow-50 p-4">

                  <div className="flex items-center gap-2 text-yellow-700">

                    <Briefcase size={18} />

                    <span className="text-sm">

                      Experience

                    </span>

                  </div>

                  <h3 className="mt-2 text-2xl font-bold">

                    {candidate.experienceYears}

                    {" "}yrs

                  </h3>

                </div>

                <div className="rounded-xl bg-purple-50 p-4">

                  <div className="flex items-center gap-2 text-purple-700">

                    <Brain size={18} />

                    <span className="text-sm">

                      Status

                    </span>

                  </div>

                  <span
                    className={`inline-flex mt-3 px-3 py-1 rounded-full text-sm font-semibold ${
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

                <div className="mt-6">

                  <h3 className="font-semibold text-gray-700 mb-3">

                    Skills

                  </h3>

                  <div className="flex flex-wrap gap-2">

                    {candidate.skills

                      .slice(0, 6)

                      .map(skill => (

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

              {/* Actions */}

              <div className="grid grid-cols-2 gap-3 mt-8">

                <button

                  onClick={() =>

                    onViewCandidate?.(

                      candidate

                    )

                  }

                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition"

                >

                  <Eye size={18} />

                  View

                </button>

                <button

                  onClick={() =>

                    onCompareCandidate?.(

                      candidate

                    )

                  }

                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#173E7D] text-[#173E7D] font-semibold hover:bg-blue-50 transition"

                >

                  <Scale size={18} />

                  Compare

                </button>

              </div>

            </div>

          </div>

        ))}
              </div>

      {/* Footer */}

      <div className="mt-8 border-t border-gray-200 pt-6">

        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">

          {/* Left */}

          <div className="text-sm text-gray-500">

            Showing

            {" "}

            <span className="font-semibold text-[#173E7D]">

              {candidates.length}

            </span>

            {" "}

            ranked candidate

            {candidates.length !== 1 && "s"}

          </div>

          {/* Center */}

          <div className="flex items-center gap-6 text-sm">

            <div className="flex items-center gap-2">

              <Trophy
                size={18}
                className="text-yellow-500"
              />

              <span>

                #1 = Highest AI Score

              </span>

            </div>

            <div className="flex items-center gap-2">

              <Brain
                size={18}
                className="text-[#173E7D]"
              />

              <span>

                AI Ranking Updated

              </span>

            </div>

          </div>

          {/* Right */}

          <div>

            <button

              className="px-5 py-2 rounded-xl border border-[#173E7D] text-[#173E7D] hover:bg-blue-50 transition"

            >

              Export Ranking

            </button>

          </div>

        </div>

      </div>

    </>

  );

}