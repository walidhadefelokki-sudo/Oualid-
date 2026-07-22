import {
  Brain,
  Trophy,
  Users,
  Loader2,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingLoading() {

  return (

    <div className="space-y-8 animate-pulse">

      {/* Header Skeleton */}

      <div className="rounded-3xl bg-gradient-to-r from-[#173E7D] to-[#2154A6] p-10 text-white overflow-hidden">

        <div className="flex flex-col xl:flex-row justify-between gap-10">

          <div className="flex items-center gap-6">

            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">

              <Loader2
                size={42}
                className="animate-spin"
              />

            </div>

            <div>

              <div className="h-8 w-72 rounded bg-white/20" />

              <div className="mt-4 h-5 w-96 rounded bg-white/20" />

              <div className="mt-3 h-5 w-80 rounded bg-white/20" />

            </div>

          </div>

          <div className="grid grid-cols-2 gap-5">

            <div className="w-40 h-32 rounded-2xl bg-white/15" />

            <div className="w-40 h-32 rounded-2xl bg-white/15" />

            <div className="col-span-2 h-32 rounded-2xl bg-white/15" />

          </div>

        </div>

      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {[1, 2, 3, 4].map(card => (

          <div

            key={card}

            className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6"

          >

            <div className="flex justify-between">

              <div>

                <div className="h-4 w-24 rounded bg-gray-200" />

                <div className="mt-5 h-10 w-20 rounded bg-gray-200" />

              </div>

              <div className="w-14 h-14 rounded-2xl bg-gray-200" />

            </div>

          </div>

        ))}

      </div>

      {/* Toolbar */}

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">

        <div className="flex flex-col xl:flex-row gap-5 justify-between">

          <div className="h-12 flex-1 rounded-xl bg-gray-200" />

          <div className="flex gap-3">

            <div className="h-12 w-40 rounded-xl bg-gray-200" />

            <div className="h-12 w-40 rounded-xl bg-gray-200" />

          </div>

        </div>

      </div>

      {/* Ranking Table */}

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        {/* Table Header */}

        <div className="grid grid-cols-8 gap-4 bg-gray-100 px-6 py-5">

          {[1,2,3,4,5,6,7,8].map(col => (

            <div

              key={col}

              className="h-5 rounded bg-gray-300"

            />

          ))}

        </div>

        {/* Rows */}

        {[1,2,3,4,5,6].map(row => (

          <div

            key={row}

            className="grid grid-cols-8 gap-4 px-6 py-6 border-t border-gray-100"

          >

            <div className="flex justify-center">

              <div className="w-10 h-10 rounded-full bg-gray-200" />

            </div>

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-full bg-gray-200" />

              <div>

                <div className="h-4 w-36 rounded bg-gray-200" />

                <div className="mt-2 h-3 w-28 rounded bg-gray-200" />

              </div>

            </div>

            <div className="flex justify-center">

              <div className="h-10 w-16 rounded-xl bg-gray-200" />

            </div>

            <div className="flex justify-center">

              <div className="h-10 w-16 rounded-xl bg-gray-200" />

            </div>

            <div className="flex justify-center">

              <div className="h-10 w-16 rounded-xl bg-gray-200" />

            </div>

            <div className="flex justify-center">

              <div className="h-10 w-16 rounded-xl bg-gray-200" />

            </div>

            <div className="flex justify-center">

              <div className="h-10 w-28 rounded-full bg-gray-200" />

            </div>

            <div className="flex justify-center gap-2">

              <div className="w-10 h-10 rounded-xl bg-gray-200" />

              <div className="w-10 h-10 rounded-xl bg-gray-200" />

              <div className="w-10 h-10 rounded-xl bg-gray-200" />

            </div>

          </div>

        ))}

      </div>

      {/* Bottom Status */}

      <div className="rounded-3xl bg-gradient-to-r from-[#173E7D] to-[#2154A6] p-8 text-white">

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

          <div className="flex items-center gap-5">

            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">

              <Brain size={32} />

            </div>

            <div>

              <h2 className="text-2xl font-bold">

                AI Ranking Engine

              </h2>

              <p className="text-blue-100 mt-2">

                Calculating candidate rankings...

              </p>

            </div>

          </div>

          <div className="flex gap-8">

            <Users
              size={32}
              className="opacity-70"
            />

            <Trophy
              size={32}
              className="opacity-70"
            />

            <Loader2
              size={32}
              className="animate-spin"
            />

          </div>

        </div>

      </div>

    </div>

  );

}