import {
  Brain,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizInstructionsProps {
  totalQuestions: number;
  duration: number; // minutes
  passingScore?: number;
  onStart: () => void;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizInstructions({
  totalQuestions,
  duration,
  passingScore = 70,
  onStart,
}: QuizInstructionsProps) {
  return (
    <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Header */}

      <div className="bg-[#173E7D] text-white p-8">

        <div className="flex items-center gap-4">

          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">

            <Brain size={34} />

          </div>

          <div>

            <h1 className="text-3xl font-black">

              AI Recruitment Quiz

            </h1>

            <p className="mt-2 text-blue-100">

              Your quiz has been generated based on your CV and professional profile.

            </p>

          </div>

        </div>

      </div>

      {/* Information */}

      <div className="p-8">

        <div className="grid md:grid-cols-3 gap-6">

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">

            <Clock className="text-[#173E7D]" size={30} />

            <h3 className="font-bold text-lg mt-4">
              Duration
            </h3>

            <p className="text-gray-600 mt-2">
              {duration} minutes
            </p>

          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-6">

            <CheckCircle2
              className="text-green-600"
              size={30}
            />

            <h3 className="font-bold text-lg mt-4">
              Questions
            </h3>

            <p className="text-gray-600 mt-2">
              {totalQuestions} Questions
            </p>

          </div>

          <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-6">

            <ShieldCheck
              className="text-yellow-600"
              size={30}
            />

            <h3 className="font-bold text-lg mt-4">
              Passing Score
            </h3>

            <p className="text-gray-600 mt-2">
              {passingScore}%
            </p>

          </div>

        </div>

        {/* Rules */}

        <div className="mt-10">

          <h2 className="text-2xl font-bold text-[#173E7D]">

            Quiz Rules

          </h2>

          <div className="mt-6 space-y-5">

            <div className="flex gap-4">

              <CheckCircle2
                className="text-green-600 mt-1"
                size={22}
              />

              <p className="text-gray-700">

                Read every question carefully before answering.

              </p>

            </div>

            <div className="flex gap-4">

              <CheckCircle2
                className="text-green-600 mt-1"
                size={22}
              />

              <p className="text-gray-700">

                Select only one answer for each question.

              </p>

            </div>

            <div className="flex gap-4">

              <CheckCircle2
                className="text-green-600 mt-1"
                size={22}
              />

              <p className="text-gray-700">

                You can move between questions before submitting.

              </p>

            </div>

            <div className="flex gap-4">

              <CheckCircle2
                className="text-green-600 mt-1"
                size={22}
              />

              <p className="text-gray-700">

                The quiz will automatically submit when the timer reaches zero.

              </p>

            </div>

          </div>

        </div>

        {/* Warning */}

        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6">

          <div className="flex gap-4">

            <AlertTriangle
              className="text-red-600 mt-1"
              size={24}
            />

            <div>

              <h3 className="font-bold text-red-700">

                Important

              </h3>

              <p className="text-red-600 mt-2">

                This assessment is part of your recruitment process.
                Your results will be visible to recruiters.

              </p>

            </div>

          </div>

        </div>

        {/* Footer */}

        <div className="mt-12 flex justify-end">

          <button
            onClick={onStart}
            className="flex items-center gap-3 bg-[#173E7D] text-white px-10 py-4 rounded-2xl font-bold hover:bg-[#0F2E63] transition"
          >

            <PlayCircle size={22} />

            Start Quiz

          </button>

        </div>

      </div>

    </div>
  );
}