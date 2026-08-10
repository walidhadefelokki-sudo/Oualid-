import {
  useMemo,
} from "react";

import {
  BarChart3,
  Brain,
  Trophy,
  Users,
  Briefcase,
} from "lucide-react";

import {
  CandidateRanking,
} from "../../../types/ranking";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface RankingChartsProps {

  candidates: CandidateRanking[];

}

///////////////////////////////////////////////////////////////
// SCORE RANGE
///////////////////////////////////////////////////////////////

interface ScoreRange {

  label: string;

  count: number;

}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function RankingCharts({

  candidates,

}: RankingChartsProps) {

  /////////////////////////////////////////////////////////////
  // AI DISTRIBUTION
  /////////////////////////////////////////////////////////////

  const scoreDistribution =
    useMemo<ScoreRange[]>(() => {

      const ranges: ScoreRange[] = [

        {

          label: "90-100",

          count: 0,

        },

        {

          label: "80-89",

          count: 0,

        },

        {

          label: "70-79",

          count: 0,

        },

        {

          label: "60-69",

          count: 0,

        },

        {

          label: "<60",

          count: 0,

        },

      ];

      candidates.forEach(

        candidate => {

          const score =

            candidate.aiScore;

          if (score >= 90)

            ranges[0].count++;

          else if (score >= 80)

            ranges[1].count++;

          else if (score >= 70)

            ranges[2].count++;

          else if (score >= 60)

            ranges[3].count++;

          else

            ranges[4].count++;

        }

      );

      return ranges;

    },

    [

      candidates,

    ]);

  /////////////////////////////////////////////////////////////
  // EXPERIENCE
  /////////////////////////////////////////////////////////////

  const averageExperience =
    useMemo(() => {

      if (

        candidates.length === 0

      ) {

        return 0;

      }

      return (

        candidates.reduce(

          (

            total,

            candidate

          ) =>

            total +

            candidate.experienceYears,

          0

        )

        /

        candidates.length

      ).toFixed(1);

    },

    [

      candidates,

    ]);

  /////////////////////////////////////////////////////////////
  // PRESELECTED
  /////////////////////////////////////////////////////////////

  const preselected =
    useMemo(() => {

      return candidates.filter(

        c =>

          c.isPreselected

      ).length;

    },

    [

      candidates,

    ]);

  /////////////////////////////////////////////////////////////
  // MAX BAR
  /////////////////////////////////////////////////////////////

  const maxValue =
    Math.max(

      ...scoreDistribution.map(

        item =>

          item.count

      ),

      1

    );

  /////////////////////////////////////////////////////////////
  // RENDER
  /////////////////////////////////////////////////////////////

  return (

    <div className="space-y-8">

      {/* Header */}

      <div className="flex items-center gap-4">

        <div className="w-16 h-16 rounded-2xl bg-[#173E7D] text-white flex items-center justify-center">

          <BarChart3 size={34} />

        </div>

        <div>

          <h2 className="text-3xl font-black text-[#173E7D]">

            AI Recruitment Analytics

          </h2>

          <p className="text-gray-500 mt-2">

            Visual overview of candidate performance and ranking.

          </p>

        </div>

      </div>

      {/* KPI Cards */}

      <div className="grid md:grid-cols-3 gap-6">

        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">

                Candidates

              </p>

              <h2 className="mt-3 text-4xl font-black text-[#173E7D]">

                {candidates.length}

              </h2>

            </div>

            <Users

              size={34}

              className="text-[#173E7D]"

            />

          </div>

        </div>

        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">

                Avg Experience

              </p>

              <h2 className="mt-3 text-4xl font-black text-green-600">

                {averageExperience}

              </h2>

            </div>

            <Briefcase

              size={34}

              className="text-green-600"

            />

          </div>

        </div>

        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">

                Preselected

              </p>

              <h2 className="mt-3 text-4xl font-black text-yellow-600">

                {preselected}

              </h2>

            </div>

            <Trophy

              size={34}

              className="text-yellow-600"

            />

          </div>

        </div>

      </div>

      {/* Charts */}

      <div className="grid xl:grid-cols-2 gap-8">
              {/* AI Score Distribution */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

        <div className="flex items-center gap-3 mb-8">

          <Brain
            size={28}
            className="text-[#173E7D]"
          />

          <h3 className="text-2xl font-bold text-[#173E7D]">

            AI Score Distribution

          </h3>

        </div>

        <div className="space-y-6">

          {scoreDistribution.map((item) => {

            const percentage =
              (item.count / maxValue) * 100;

            return (

              <div
                key={item.label}
                className="space-y-2"
              >

                <div className="flex justify-between text-sm font-medium">

                  <span>

                    {item.label}

                  </span>

                  <span>

                    {item.count}

                  </span>

                </div>

                <div className="h-4 rounded-full bg-gray-200 overflow-hidden">

                  <div

                    className="h-full rounded-full bg-gradient-to-r from-[#173E7D] to-[#2154A6] transition-all duration-700"

                    style={{

                      width: `${percentage}%`,

                    }}

                  />

                </div>

              </div>

            );

          })}

        </div>

      </div>

      {/* Recruitment Status */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

        <div className="flex items-center gap-3 mb-8">

          <Trophy
            size={28}
            className="text-yellow-500"
          />

          <h3 className="text-2xl font-bold text-[#173E7D]">

            Recruitment Status

          </h3>

        </div>

        <div className="space-y-8">

          {/* Preselected */}

          <div>

            <div className="flex justify-between mb-2">

              <span className="font-medium">

                Preselected

              </span>

              <span>

                {preselected}

              </span>

            </div>

            <div className="h-5 rounded-full bg-gray-200 overflow-hidden">

              <div

                className="h-full rounded-full bg-green-500"

                style={{

                  width: `${
                    candidates.length === 0

                      ? 0

                      : (preselected /
                          candidates.length) *
                        100
                  }%`,

                }}

              />

            </div>

          </div>

          {/* Pending */}

          <div>

            <div className="flex justify-between mb-2">

              <span className="font-medium">

                Pending

              </span>

              <span>

                {candidates.length - preselected}

              </span>

            </div>

            <div className="h-5 rounded-full bg-gray-200 overflow-hidden">

              <div

                className="h-full rounded-full bg-yellow-500"

                style={{

                  width: `${
                    candidates.length === 0

                      ? 0

                      : ((candidates.length -
                          preselected) /
                          candidates.length) *
                        100
                  }%`,

                }}

              />

            </div>

          </div>

        </div>

      </div>

      {/* Experience Distribution */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

        <div className="flex items-center gap-3 mb-8">

          <Briefcase
            size={28}
            className="text-green-600"
          />

          <h3 className="text-2xl font-bold text-[#173E7D]">

            Experience Distribution

          </h3>

        </div>

        <div className="space-y-5">

          {[

            {

              label: "0-2 Years",

              value: candidates.filter(

                c =>

                  c.experienceYears <= 2

              ).length,

            },

            {

              label: "3-5 Years",

              value: candidates.filter(

                c =>

                  c.experienceYears >= 3 &&

                  c.experienceYears <= 5

              ).length,

            },

            {

              label: "6-10 Years",

              value: candidates.filter(

                c =>

                  c.experienceYears >= 6 &&

                  c.experienceYears <= 10

              ).length,

            },

            {

              label: "10+ Years",

              value: candidates.filter(

                c =>

                  c.experienceYears > 10

              ).length,

            },

          ].map((item) => (

            <div
              key={item.label}
              className="space-y-2"
            >

              <div className="flex justify-between text-sm font-medium">

                <span>

                  {item.label}

                </span>

                <span>

                  {item.value}

                </span>

              </div>

              <div className="h-4 rounded-full bg-gray-200 overflow-hidden">

                <div

                  className="h-full rounded-full bg-green-500 transition-all duration-700"

                  style={{

                    width: `${
                      candidates.length === 0

                        ? 0

                        : (item.value /
                            candidates.length) *
                          100
                    }%`,

                  }}

                />

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* Overall AI Performance */}

      <div className="rounded-3xl bg-gradient-to-br from-[#173E7D] to-[#2154A6] text-white shadow-xl p-8">

        <div className="flex items-center gap-3 mb-8">

          <Brain size={30} />

          <h3 className="text-2xl font-bold">

            Overall AI Performance

          </h3>

        </div>

        <div className="space-y-8">

          <div>

            <p className="text-blue-100">

              Average AI Score

            </p>

            <h2 className="text-6xl font-black mt-3">

              {candidates.length === 0

                ? "0"

                : (
                    candidates.reduce(

                      (sum, c) =>

                        sum +

                        c.aiScore,

                      0

                    ) /

                    candidates.length

                  ).toFixed(1)}

            </h2>

          </div>

          <div className="h-4 rounded-full bg-white/20 overflow-hidden">

            <div

              className="h-full rounded-full bg-white"

              style={{

                width: `${
                  candidates.length === 0

                    ? 0

                    : (
                        candidates.reduce(

                          (sum, c) =>

                            sum +

                            c.aiScore,

                          0

                        ) /

                        candidates.length
                      )
                }%`,

              }}

            />

          </div>

          <p className="text-blue-100 leading-7">

            AI ranking combines CV analysis, technical assessment,
            oral presentation, professional experience and skills
            matching to identify the strongest candidates.

          </p>

        </div>

      </div>
            {/* Top Skills */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

        <div className="flex items-center gap-3 mb-8">

          <BarChart3
            size={28}
            className="text-[#173E7D]"
          />

          <h3 className="text-2xl font-bold text-[#173E7D]">

            Top Skills

          </h3>

        </div>

        <div className="space-y-4">

          {(() => {

            const skills = new Map<string, number>();

            candidates.forEach(candidate => {

              candidate.skills?.forEach(skill => {

                skills.set(

                  skill,

                  (skills.get(skill) ?? 0) + 1

                );

              });

            });

            return [...skills.entries()]

              .sort((a, b) => b[1] - a[1])

              .slice(0, 8)

              .map(([skill, count]) => (

                <div

                  key={skill}

                  className="space-y-2"

                >

                  <div className="flex justify-between text-sm font-medium">

                    <span>

                      {skill}

                    </span>

                    <span>

                      {count}

                    </span>

                  </div>

                  <div className="h-3 rounded-full bg-gray-200 overflow-hidden">

                    <div

                      className="h-full rounded-full bg-[#173E7D]"

                      style={{

                        width: `${
                          candidates.length === 0

                            ? 0

                            : (count /

                                candidates.length) *

                              100

                        }%`,

                      }}

                    />

                  </div>

                </div>

              ));

          })()}

        </div>

      </div>

      {/* Top Performers */}

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

        <div className="flex items-center gap-3 mb-8">

          <Trophy
            size={28}
            className="text-yellow-500"
          />

          <h3 className="text-2xl font-bold text-[#173E7D]">

            Top Performers

          </h3>

        </div>

        <div className="space-y-4">

          {candidates

            .slice()

            .sort(

              (a, b) =>

                b.aiScore -

                a.aiScore

            )

            .slice(0, 5)

            .map((candidate, index) => (

              <div

                key={candidate.id}

                className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 hover:bg-blue-50 transition"

              >

                <div className="flex items-center gap-4">

                  <div className="w-10 h-10 rounded-full bg-[#173E7D] text-white flex items-center justify-center font-bold">

                    {index + 1}

                  </div>

                  <div>

                    <h4 className="font-semibold">

                      {candidate.fullName}

                    </h4>

                    <p className="text-sm text-gray-500">

                      {candidate.experienceYears} years experience

                    </p>

                  </div>

                </div>

                <div className="text-right">

                  <p className="text-2xl font-black text-[#173E7D]">

                    {candidate.aiScore}

                  </p>

                  <p className="text-xs text-gray-500">

                    AI Score

                  </p>

                </div>

              </div>

            ))}

        </div>

      </div>

      </div>

      {/* Footer */}

      <div className="rounded-3xl bg-gradient-to-r from-[#173E7D] to-[#2154A6] text-white shadow-xl p-8">

        <div className="flex flex-col lg:flex-row justify-between gap-8">

          <div>

            <h3 className="text-3xl font-black">

              AI Recruitment Insights

            </h3>

            <p className="mt-4 text-blue-100 max-w-3xl leading-8">

              These analytics summarize the current recruitment
              campaign. Candidate rankings are generated using
              CV analysis, technical assessments, oral
              presentations, experience, and skills matching.
            </p>

          </div>

          <div className="grid grid-cols-3 gap-6">

            <div className="text-center">

              <Brain
                size={34}
                className="mx-auto mb-3"
              />

              <h4 className="text-3xl font-black">

                {candidates.length}

              </h4>

              <p className="text-blue-100 text-sm">

                Analysed

              </p>

            </div>

            <div className="text-center">

              <Users
                size={34}
                className="mx-auto mb-3"
              />

              <h4 className="text-3xl font-black">

                {preselected}

              </h4>

              <p className="text-blue-100 text-sm">

                Selected

              </p>

            </div>

            <div className="text-center">

              <Trophy
                size={34}
                className="mx-auto mb-3 text-yellow-300"
              />

              <h4 className="text-3xl font-black">

                {scoreDistribution[0].count}

              </h4>

              <p className="text-blue-100 text-sm">

                90+ Score

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}
