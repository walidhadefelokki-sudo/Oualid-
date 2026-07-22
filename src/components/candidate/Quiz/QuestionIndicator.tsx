import {
  CheckCircle2,
  Circle,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuestionIndicatorProps {
  totalQuestions: number;

  currentQuestion: number;

  answers: Record<string, string>;

  questionIds: string[];

  onSelectQuestion: (index: number) => void;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuestionIndicator({
  totalQuestions,
  currentQuestion,
  answers,
  questionIds,
  onSelectQuestion,
}: QuestionIndicatorProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

      {/* Header */}

      <div className="flex items-center justify-between mb-6">

        <div>

          <h2 className="text-xl font-bold text-[#173E7D]">

            Question Navigator

          </h2>

          <p className="text-sm text-gray-500 mt-1">

            Jump directly to any question.

          </p>

        </div>

        <span className="text-sm font-semibold text-[#173E7D]">

          {currentQuestion + 1} / {totalQuestions}

        </span>

      </div>

      {/* Grid */}

      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">

        {questionIds.map((questionId, index) => {
          const answered = !!answers[questionId];

          const active = index === currentQuestion;

          return (
            <button
              key={questionId}
              type="button"
              onClick={() => onSelectQuestion(index)}
              className={`
                relative
                w-14
                h-14
                rounded-2xl
                font-bold
                transition-all
                duration-200
                border-2

                ${
                  active
                    ? "bg-[#173E7D] border-[#173E7D] text-white scale-105 shadow-lg"
                    : answered
                    ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                    : "bg-white border-gray-300 text-gray-600 hover:border-[#173E7D]"
                }
              `}
            >
              {index + 1}

              {/* Status Icon */}

              {!active && answered && (
                <CheckCircle2
                  size={16}
                  className="absolute -top-1 -right-1 text-green-600 bg-white rounded-full"
                />
              )}

              {!active && !answered && (
                <Circle
                  size={12}
                  className="absolute -top-1 -right-1 text-gray-400 bg-white rounded-full"
                />
              )}
            </button>
          );
        })}

      </div>

      {/* Legend */}

      <div className="grid md:grid-cols-3 gap-4 mt-8">

        <div className="flex items-center gap-3">

          <div className="w-5 h-5 rounded bg-[#173E7D]" />

          <span className="text-sm text-gray-600">

            Current Question

          </span>

        </div>

        <div className="flex items-center gap-3">

          <div className="w-5 h-5 rounded bg-green-100 border border-green-300" />

          <span className="text-sm text-gray-600">

            Answered

          </span>

        </div>

        <div className="flex items-center gap-3">

          <div className="w-5 h-5 rounded bg-white border border-gray-300" />

          <span className="text-sm text-gray-600">

            Unanswered

          </span>

        </div>

      </div>

      {/* Progress */}

      <div className="mt-8">

        <div className="flex justify-between text-sm mb-2">

          <span className="text-gray-500">

            Completion

          </span>

          <span className="font-bold text-[#173E7D]">

            {Math.round(
              (Object.keys(answers).length / totalQuestions) * 100
            )}
            %
          </span>

        </div>

        <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">

          <div
            className="h-full bg-[#173E7D] transition-all duration-500"
            style={{
              width: `${
                (Object.keys(answers).length / totalQuestions) * 100
              }%`,
            }}
          />

        </div>

      </div>

    </div>
  );
}