import { CheckCircle2, HelpCircle } from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizProgress({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
}: QuizProgressProps) {
  const percentage =
    totalQuestions > 0
      ? Math.round((currentQuestion / totalQuestions) * 100)
      : 0;

  const remainingQuestions =
    totalQuestions - answeredQuestions;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

      {/* Header */}

      <div className="flex items-center justify-between mb-5">

        <div>

          <h2 className="text-xl font-bold text-[#173E7D]">
            Quiz Progress
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Follow your assessment progress.
          </p>

        </div>

        <div className="text-right">

          <p className="text-3xl font-black text-[#173E7D]">
            {percentage}%
          </p>

        </div>

      </div>

      {/* Progress Bar */}

      <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">

        <div
          className="h-full bg-[#173E7D] transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

      {/* Current Question */}

      <div className="flex justify-between mt-4">

        <span className="text-gray-500">
          Current Question
        </span>

        <span className="font-bold text-[#173E7D]">
          {currentQuestion} / {totalQuestions}
        </span>

      </div>

      {/* Statistics */}

      <div className="grid grid-cols-2 gap-5 mt-8">

        {/* Answered */}

        <div className="rounded-2xl bg-green-50 p-5 border border-green-100">

          <div className="flex items-center gap-3">

            <CheckCircle2
              size={22}
              className="text-green-600"
            />

            <div>

              <p className="text-sm text-gray-500">
                Answered
              </p>

              <h3 className="text-2xl font-black text-green-600">
                {answeredQuestions}
              </h3>

            </div>

          </div>

        </div>

        {/* Remaining */}

        <div className="rounded-2xl bg-orange-50 p-5 border border-orange-100">

          <div className="flex items-center gap-3">

            <HelpCircle
              size={22}
              className="text-orange-600"
            />

            <div>

              <p className="text-sm text-gray-500">
                Remaining
              </p>

              <h3 className="text-2xl font-black text-orange-600">
                {remainingQuestions}
              </h3>

            </div>

          </div>

        </div>

      </div>

      {/* Footer */}

      <div className="mt-6 text-center">

        <p className="text-sm text-gray-500">

          Complete every question to maximize your score.

        </p>

      </div>

    </div>
  );
}