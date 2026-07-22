import {
  Trophy,
  Brain,
  Users,
  TrendingUp,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingHeaderProps {

  totalCandidates: number;

  averageScore: number;

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingHeader({

  totalCandidates,

  averageScore,

}: RankingHeaderProps) {

  return (

    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#173E7D] via-[#1B4A93] to-[#2154A6] text-white shadow-xl">

      {/* Decorative Background */}

      <div className="absolute inset-0 opacity-10">

        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white" />

        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white" />

      </div>

      {/* Content */}

      <div className="relative z-10 p-10">

        <div className="flex flex-col xl:flex-row justify-between gap-10 items-start xl:items-center">

          {/* Left */}

          <div>

            <div className="flex items-center gap-4">

              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">

                <Trophy

                  size={42}

                  className="text-yellow-300"

                />

              </div>

              <div>

                <h1 className="text-4xl font-black">

                  Corporate AI Candidate Ranking

                </h1>

                <p className="text-blue-100 mt-2 text-lg">

                  Automatically rank candidates using AI-powered recruitment analysis.

                </p>

              </div>

            </div>

            <p className="mt-8 max-w-3xl text-blue-100 leading-8">

              The ranking combines CV analysis, AI skill matching,
              technical quiz results, oral presentation evaluation,
              professional experience and recruiter preferences to
              identify the strongest candidates for each position.

            </p>

          </div>

          {/* Right */}

          <div className="grid grid-cols-2 gap-5 min-w-[320px]">

            {/* Candidates */}

            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6">

              <div className="flex items-center gap-3">

                <Users size={22} />

                <span className="text-sm">

                  Candidates

                </span>

              </div>

              <h2 className="text-4xl font-black mt-4">

                {totalCandidates}

              </h2>

            </div>

            {/* AI */}

            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6">

              <div className="flex items-center gap-3">

                <Brain size={22} />

                <span className="text-sm">

                  Average AI

                </span>

              </div>

              <h2 className="text-4xl font-black mt-4">

                {averageScore.toFixed(1)}

              </h2>

            </div>

            {/* Status */}

            <div className="col-span-2 rounded-2xl bg-white/10 backdrop-blur-sm p-6">

              <div className="flex items-center gap-3">

                <TrendingUp

                  size={22}

                />

                <span>

                  AI Ranking Engine

                </span>

              </div>

              <p className="mt-4 text-blue-100 leading-7">

                Rankings update automatically whenever a candidate
                uploads a CV, completes an AI quiz, records an oral
                presentation or recruiter evaluation changes.

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}