import {
  Trophy,
  CheckCircle2,
  XCircle,
  Target,
  Brain,
  Award,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizResultProps {
  score: number;

  totalQuestions: number;

  correctAnswers: number;

  passingScore?: number;

  onFinish?: () => void;

  onRetry?: () => void;

  showRetry?: boolean;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizResult({
  score,
  totalQuestions,
  correctAnswers,
  passingScore = 70,
  onFinish,
  onRetry,
  showRetry = false,
}: QuizResultProps) {
  const passed = score >= passingScore;

  const incorrectAnswers = totalQuestions - correctAnswers;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">

      {/* Header */}

      <div
        className={`p-10 text-center ${
          passed ? "bg-green-50" : "bg-red-50"
        }`}
      >
        <div
          className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center ${
            passed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <Trophy
            size={58}
            className={passed ? "text-green-600" : "text-red-600"}
          />
        </div>

        <h1
          className={`text-4xl font-black mt-6 ${
            passed ? "text-green-700" : "text-red-700"
          }`}
        >
          {passed ? "Congratulations!" : "Quiz Completed"}
        </h1>

        <p className="text-gray-600 mt-3 text-lg">
          {passed
            ? "You successfully passed this assessment."
            : "You did not reach the required passing score."}
        </p>
      </div>

      {/* Score */}

      <div className="py-10 flex justify-center">

        <div className="w-56 h-56 rounded-full border-[14px] border-[#173E7D] flex items-center justify-center">

          <div className="text-center">

            <h2 className="text-6xl font-black text-[#173E7D]">

              {score}

            </h2>

            <p className="text-gray-500 text-lg">

              %

            </p>

          </div>

        </div>

      </div>

      {/* Statistics */}

      <div className="grid md:grid-cols-4 gap-5 px-10">

        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6 text-center">

          <Brain className="mx-auto text-[#173E7D]" size={32} />

          <p className="text-sm text-gray-500 mt-3">
            Questions
          </p>

          <h3 className="text-3xl font-black text-[#173E7D]">

            {totalQuestions}

          </h3>

        </div>

        <div className="rounded-2xl bg-green-50 border border-green-100 p-6 text-center">

          <CheckCircle2 className="mx-auto text-green-600" size={32} />

          <p className="text-sm text-gray-500 mt-3">

            Correct

          </p>

          <h3 className="text-3xl font-black text-green-600">

            {correctAnswers}

          </h3>

        </div>

        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center">

          <XCircle className="mx-auto text-red-600" size={32} />

          <p className="text-sm text-gray-500 mt-3">

            Incorrect

          </p>

          <h3 className="text-3xl font-black text-red-600">

            {incorrectAnswers}

          </h3>

        </div>

        <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-6 text-center">

          <Target className="mx-auto text-yellow-600" size={32} />

          <p className="text-sm text-gray-500 mt-3">

            Passing Score

          </p>

          <h3 className="text-3xl font-black text-yellow-600">

            {passingScore}%

          </h3>

        </div>

      </div>

      {/* Result */}

      <div className="mx-10 mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Award
              size={28}
              className="text-[#173E7D]"
            />

            <div>

              <h3 className="font-bold text-[#173E7D]">

                Final Result

              </h3>

              <p className="text-gray-500">

                AI Recruitment Assessment

              </p>

            </div>

          </div>

          <span
            className={`px-6 py-3 rounded-full font-bold ${
              passed
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {passed ? "PASSED" : "FAILED"}
          </span>

        </div>

      </div>

      {/* Information */}

      <div className="px-10 mt-8">

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">

          <h3 className="font-bold text-[#173E7D]">

            Recruiter Information

          </h3>

          <p className="text-gray-600 mt-3">

            Your quiz score will be attached to your application
            and will be visible to recruiters alongside your CV,
            oral presentation, and AI evaluation.

          </p>

        </div>

      </div>

      {/* Footer */}

      <div className="flex flex-col md:flex-row justify-center gap-5 p-10">

        {showRetry && onRetry && (

          <button
            onClick={onRetry}
            className="px-8 py-4 rounded-2xl border border-[#173E7D] text-[#173E7D] font-bold hover:bg-blue-50 transition"
          >
            Retry Quiz
          </button>

        )}

        {onFinish && (

          <button
            onClick={onFinish}
            className="px-10 py-4 rounded-2xl bg-[#173E7D] text-white font-bold hover:bg-[#0F2E63] transition"
          >
            Continue
          </button>

        )}

      </div>

    </div>
  );
}