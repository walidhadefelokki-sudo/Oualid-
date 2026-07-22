import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizNavigationProps {
  currentQuestion: number;
  totalQuestions: number;

  loading?: boolean;

  canGoPrevious: boolean;
  canGoNext: boolean;

  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizNavigation({
  currentQuestion,
  totalQuestions,

  loading = false,

  canGoPrevious,
  canGoNext,

  onPrevious,
  onNext,
  onFinish,
}: QuizNavigationProps) {
  const isLastQuestion =
    currentQuestion === totalQuestions;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        {/* Left */}

        <div>

          <h2 className="text-lg font-bold text-[#173E7D]">
            Navigation
          </h2>

          <p className="text-sm text-gray-500 mt-1">

            Question {currentQuestion} of {totalQuestions}

          </p>

        </div>

        {/* Buttons */}

        <div className="flex flex-wrap gap-4">

          {/* Previous */}

          <button
            type="button"
            disabled={!canGoPrevious || loading}
            onClick={onPrevious}
            className="
              flex
              items-center
              gap-2
              px-6
              py-3
              rounded-xl
              border
              border-gray-300
              bg-white
              hover:bg-gray-50
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            <ChevronLeft size={20} />

            Previous

          </button>

          {/* Next */}

          {!isLastQuestion && (

            <button
              type="button"
              disabled={!canGoNext || loading}
              onClick={onNext}
              className="
                flex
                items-center
                gap-2
                px-7
                py-3
                rounded-xl
                bg-[#173E7D]
                text-white
                font-semibold
                hover:bg-[#0E2E61]
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              Next

              <ChevronRight size={20} />

            </button>

          )}

          {/* Finish */}

          {isLastQuestion && (

            <button
              type="button"
              disabled={loading}
              onClick={onFinish}
              className="
                flex
                items-center
                gap-2
                px-8
                py-3
                rounded-xl
                bg-green-600
                text-white
                font-semibold
                hover:bg-green-700
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              <CheckCircle2 size={20} />

              {loading
                ? "Submitting..."
                : "Finish Quiz"}

            </button>

          )}

        </div>

      </div>

      {/* Footer */}

      <div className="mt-6 border-t border-gray-100 pt-5">

        <p className="text-sm text-gray-500">

          Your answers are automatically saved locally while you progress through the quiz.

        </p>

      </div>

    </div>
  );
}