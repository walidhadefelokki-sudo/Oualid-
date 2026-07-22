import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowLeft,
  Send,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface QuizSummaryQuestion {
  id: string;
  question: string;
}

interface QuizSummaryProps {
  questions: QuizSummaryQuestion[];

  answers: Record<string, string>;

  onGoToQuestion: (index: number) => void;

  onSubmit: () => void;

  onBack: () => void;

  loading?: boolean;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizSummary({
  questions,
  answers,
  onGoToQuestion,
  onSubmit,
  onBack,
  loading = false,
}: QuizSummaryProps) {
  const answered = Object.keys(answers).length;

  const unanswered = questions.length - answered;

  const completion =
    questions.length === 0
      ? 0
      : Math.round((answered / questions.length) * 100);

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Header */}

      <div className="bg-[#173E7D] text-white p-8">

        <h1 className="text-3xl font-black">

          Quiz Summary

        </h1>

        <p className="text-blue-100 mt-2">

          Review your answers before submitting your assessment.

        </p>

      </div>

      {/* Statistics */}

      <div className="grid md:grid-cols-3 gap-6 p-8">

        <div className="rounded-2xl bg-green-50 border border-green-200 p-6 text-center">

          <CheckCircle2
            size={34}
            className="mx-auto text-green-600"
          />

          <h2 className="text-3xl font-black text-green-600 mt-3">

            {answered}

          </h2>

          <p className="text-gray-500 mt-1">

            Answered

          </p>

        </div>

        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">

          <AlertCircle
            size={34}
            className="mx-auto text-red-600"
          />

          <h2 className="text-3xl font-black text-red-600 mt-3">

            {unanswered}

          </h2>

          <p className="text-gray-500 mt-1">

            Unanswered

          </p>

        </div>

        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 text-center">

          <Circle
            size={34}
            className="mx-auto text-[#173E7D]"
          />

          <h2 className="text-3xl font-black text-[#173E7D] mt-3">

            {completion}%

          </h2>

          <p className="text-gray-500 mt-1">

            Completion

          </p>

        </div>

      </div>

      {/* Question List */}

      <div className="px-8 pb-8">

        <h2 className="text-2xl font-bold text-[#173E7D] mb-6">

          Review Questions

        </h2>

        <div className="space-y-4">

          {questions.map((question, index) => {
            const answered = !!answers[question.id];

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onGoToQuestion(index)}
                className={`
                  w-full
                  rounded-2xl
                  border
                  p-5
                  text-left
                  transition-all
                  hover:shadow-md

                  ${
                    answered
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                `}
              >
                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-5">

                    <div
                      className={`
                        w-10
                        h-10
                        rounded-full
                        flex
                        items-center
                        justify-center
                        font-bold
                        ${
                          answered
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                        }
                      `}
                    >
                      {index + 1}
                    </div>

                    <div>

                      <h3 className="font-semibold text-gray-800">

                        {question.question}

                      </h3>

                      <p className="text-sm text-gray-500 mt-1">

                        {answered
                          ? "Answer selected"
                          : "No answer selected"}

                      </p>

                    </div>

                  </div>

                  {answered ? (
                    <CheckCircle2
                      size={28}
                      className="text-green-600"
                    />
                  ) : (
                    <AlertCircle
                      size={28}
                      className="text-red-600"
                    />
                  )}

                </div>

              </button>
            );
          })}

        </div>

      </div>

      {/* Warning */}

      {unanswered > 0 && (
        <div className="mx-8 mb-8 rounded-2xl border border-yellow-300 bg-yellow-50 p-6">

          <div className="flex gap-4">

            <AlertCircle
              size={26}
              className="text-yellow-600 mt-1"
            />

            <div>

              <h3 className="font-bold text-yellow-700">

                Unanswered Questions

              </h3>

              <p className="text-yellow-700 mt-2">

                You still have {unanswered} unanswered question
                {unanswered > 1 ? "s" : ""}. You can submit now,
                but unanswered questions will count as incorrect.

              </p>

            </div>

          </div>

        </div>
      )}

      {/* Footer */}

      <div className="border-t border-gray-200 p-8 flex flex-col md:flex-row justify-between gap-4">

        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-[#173E7D] text-[#173E7D] font-bold hover:bg-blue-50 transition"
        >
          <ArrowLeft size={20} />

          Back to Quiz

        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-[#173E7D] text-white font-bold hover:bg-[#0F2E63] transition disabled:opacity-60"
        >
          <Send size={20} />

          {loading
            ? "Submitting..."
            : "Submit Quiz"}

        </button>

      </div>

    </div>
  );
}