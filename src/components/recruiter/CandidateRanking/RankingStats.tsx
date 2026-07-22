import {
  Users,
  Brain,
  Trophy,
  CheckCircle2,
  TrendingUp,
  BarChart3,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingStatsProps {

  totalCandidates: number;

  averageAIScore: number;

  highestAIScore: number;

  preselectedCandidates: number;

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingStats({

  totalCandidates,

  averageAIScore,

  highestAIScore,

  preselectedCandidates,

}: RankingStatsProps) {

  const preselectionRate =
    totalCandidates === 0
      ? 0
      : (
          (preselectedCandidates /
            totalCandidates) *
          100
        ).toFixed(1);

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

      {/* Total Candidates */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 hover:shadow-lg transition">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-gray-500">

              Total Candidates

            </p>

            <h2 className="mt-3 text-4xl font-black text-[#173E7D]">

              {totalCandidates}

            </h2>

          </div>

          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">

            <Users
              size={28}
              className="text-[#173E7D]"
            />

          </div>

        </div>

      </div>

      {/* Average AI */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 hover:shadow-lg transition">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-gray-500">

              Average AI Score

            </p>

            <h2 className="mt-3 text-4xl font-black text-blue-600">

              {averageAIScore.toFixed(1)}

            </h2>

          </div>

          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">

            <Brain
              size={28}
              className="text-blue-600"
            />

          </div>

        </div>

      </div>

      {/* Highest Score */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 hover:shadow-lg transition">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-gray-500">

              Highest AI Score

            </p>

            <h2 className="mt-3 text-4xl font-black text-yellow-600">

              {highestAIScore}

            </h2>

          </div>

          <div className="w-14 h-14 rounded-2xl bg-yellow-100 flex items-center justify-center">

            <Trophy
              size={28}
              className="text-yellow-600"
            />

          </div>

        </div>

      </div>

      {/* Preselected */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 hover:shadow-lg transition">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-gray-500">

              Preselected

            </p>

            <h2 className="mt-3 text-4xl font-black text-green-600">

              {preselectedCandidates}

            </h2>

          </div>

          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">

            <CheckCircle2
              size={28}
              className="text-green-600"
            />

          </div>

        </div>

      </div>

      {/* AI Performance */}

      <div className="md:col-span-2 rounded-3xl bg-gradient-to-r from-[#173E7D] to-[#2154A6] text-white p-6 shadow-lg">

        <div className="flex items-center justify-between">

          <div>

            <div className="flex items-center gap-3">

              <TrendingUp size={28} />

              <h3 className="text-2xl font-bold">

                AI Recruitment Performance

              </h3>

            </div>

            <p className="mt-4 text-blue-100">

              Average AI score across all ranked candidates.

            </p>

          </div>

          <div className="text-right">

            <h2 className="text-5xl font-black">

              {averageAIScore.toFixed(1)}

            </h2>

            <p className="text-blue-100">

              / 100

            </p>

          </div>

        </div>

      </div>

      {/* Recruitment Summary */}

      <div className="md:col-span-2 rounded-3xl bg-white border border-gray-200 shadow-sm p-6">

        <div className="flex items-center gap-3 mb-6">

          <BarChart3
            size={28}
            className="text-[#173E7D]"
          />

          <h3 className="text-2xl font-bold text-[#173E7D]">

            Recruitment Summary

          </h3>

        </div>

        <div className="grid grid-cols-2 gap-6">

          <div>

            <p className="text-sm text-gray-500">

              Highest Candidate

            </p>

            <h4 className="mt-2 text-3xl font-black text-yellow-600">

              {highestAIScore}

            </h4>

          </div>

          <div>

            <p className="text-sm text-gray-500">

              Preselection Rate

            </p>

            <h4 className="mt-2 text-3xl font-black text-green-600">

              {preselectionRate}%

            </h4>

          </div>

          <div>

            <p className="text-sm text-gray-500">

              Candidates Ranked

            </p>

            <h4 className="mt-2 text-3xl font-black text-[#173E7D]">

              {totalCandidates}

            </h4>

          </div>

          <div>

            <p className="text-sm text-gray-500">

              AI Engine

            </p>

            <h4 className="mt-2 text-xl font-bold text-blue-600">

              Active

            </h4>

          </div>

        </div>

      </div>

    </div>

  );

}