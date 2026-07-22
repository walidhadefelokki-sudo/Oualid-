import {
  Users,
  Trophy,
  Brain,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingEmpty() {

  return (

    <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-16">

      <div className="max-w-xl mx-auto text-center">

        {/* Icon */}

        <div className="mx-auto w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center relative">

          <Users

            size={58}

            className="text-[#173E7D]"

          />

          <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">

            <Trophy

              size={24}

              className="text-yellow-600"

            />

          </div>

        </div>

        {/* Title */}

        <h2 className="mt-10 text-3xl font-black text-[#173E7D]">

          No Candidates Ranked Yet

        </h2>

        {/* Description */}

        <p className="mt-5 text-lg text-gray-600 leading-8">

          There are currently no candidates available for AI
          ranking.

          Once candidates apply for this position and complete
          their recruitment process, they will automatically
          appear here.

        </p>

        {/* Features */}

        <div className="mt-10 grid gap-4 text-left">

          <div className="flex items-center gap-4 rounded-2xl bg-blue-50 p-4">

            <Brain

              size={26}

              className="text-[#173E7D]"

            />

            <div>

              <h3 className="font-bold">

                AI Analysis

              </h3>

              <p className="text-sm text-gray-500">

                CVs are automatically analyzed by AI.

              </p>

            </div>

          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-green-50 p-4">

            <Trophy

              size={26}

              className="text-green-600"

            />

            <div>

              <h3 className="font-bold">

                Automatic Ranking

              </h3>

              <p className="text-sm text-gray-500">

                Candidates are ranked by AI score once available.

              </p>

            </div>

          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-yellow-50 p-4">

            <Users

              size={26}

              className="text-yellow-700"

            />

            <div>

              <h3 className="font-bold">

                Recruiter Dashboard

              </h3>

              <p className="text-sm text-gray-500">

                Manage and compare applicants from this page.

              </p>

            </div>

          </div>

        </div>

        {/* Button */}

        <button

          className="mt-10 px-8 py-4 rounded-2xl bg-[#173E7D] text-white font-semibold hover:bg-[#123263] transition"

        >

          Refresh Ranking

        </button>

      </div>

    </div>

  );

}