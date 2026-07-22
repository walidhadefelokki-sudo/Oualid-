import {
  CheckCircle2,
  Briefcase,
  Brain,
  ArrowRight,
  Home,
  FileText,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizCompletedProps {
  score: number;

  passed: boolean;

  applicationId?: string;

  onGoDashboard?: () => void;

  onViewApplication?: () => void;

  onContinue?: () => void;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizCompleted({
  score,
  passed,
  applicationId,

  onGoDashboard,

  onViewApplication,

  onContinue,
}: QuizCompletedProps) {
  return (
    <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">

      {/* Header */}

      <div className="bg-gradient-to-r from-[#173E7D] to-[#2154A6] text-white p-12 text-center">

        <div className="flex justify-center">

          <div className="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center">

            <CheckCircle2
              size={64}
              className="text-white"
            />

          </div>

        </div>

        <h1 className="text-4xl font-black mt-8">

          Quiz Successfully Submitted

        </h1>

        <p className="text-blue-100 mt-4 text-lg">

          Your AI assessment has been attached to your job application.

        </p>

      </div>

      {/* Summary */}

      <div className="p-10">

        <div className="grid md:grid-cols-3 gap-6">

          {/* Score */}

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6 text-center">

            <Brain
              className="mx-auto text-[#173E7D]"
              size={34}
            />

            <h3 className="mt-4 text-gray-500">

              Final Score

            </h3>

            <p className="text-4xl font-black text-[#173E7D] mt-2">

              {score}%

            </p>

          </div>

          {/* Status */}

          <div className="rounded-2xl bg-green-50 border border-green-100 p-6 text-center">

            <CheckCircle2
              className="mx-auto text-green-600"
              size={34}
            />

            <h3 className="mt-4 text-gray-500">

              Result

            </h3>

            <p
              className={`text-2xl font-black mt-2 ${
                passed
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {passed ? "PASSED" : "COMPLETED"}
            </p>

          </div>

          {/* Application */}

          <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-6 text-center">

            <Briefcase
              className="mx-auto text-yellow-600"
              size={34}
            />

            <h3 className="mt-4 text-gray-500">

              Application

            </h3>

            <p className="text-lg font-bold text-yellow-700 mt-2">

              {applicationId || "Generated"}

            </p>

          </div>

        </div>

        {/* Recruiter Notice */}

        <div className="mt-10 rounded-2xl bg-blue-50 border border-blue-200 p-8">

          <h2 className="text-2xl font-bold text-[#173E7D]">

            Recruiters Can Now See

          </h2>

          <div className="grid md:grid-cols-2 gap-5 mt-6">

            <div className="flex items-center gap-3">

              <CheckCircle2 className="text-green-600" />

              <span>Your CV</span>

            </div>

            <div className="flex items-center gap-3">

              <CheckCircle2 className="text-green-600" />

              <span>Your Oral Presentation</span>

            </div>

            <div className="flex items-center gap-3">

              <CheckCircle2 className="text-green-600" />

              <span>Your Quiz Score</span>

            </div>

            <div className="flex items-center gap-3">

              <CheckCircle2 className="text-green-600" />

              <span>Future AI Evaluation</span>

            </div>

          </div>

        </div>

        {/* Next Steps */}

        <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-8">

          <h2 className="text-2xl font-bold text-[#173E7D]">

            What Happens Next?

          </h2>

          <div className="mt-6 space-y-5">

            <div className="flex gap-4">

              <span className="font-black text-[#173E7D]">
                1.
              </span>

              <p>

                Your application is stored securely.

              </p>

            </div>

            <div className="flex gap-4">

              <span className="font-black text-[#173E7D]">
                2.
              </span>

              <p>

                Recruiters will review your profile.

              </p>

            </div>

            <div className="flex gap-4">

              <span className="font-black text-[#173E7D]">
                3.
              </span>

              <p>

                If selected, you'll receive interview notifications.

              </p>

            </div>

          </div>

        </div>

      </div>

      {/* Footer */}

      <div className="border-t border-gray-200 p-8 flex flex-wrap justify-center gap-4">

        {onViewApplication && (

          <button
            onClick={onViewApplication}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-[#173E7D] text-[#173E7D] font-bold hover:bg-blue-50 transition"
          >
            <FileText size={20} />

            View Application

          </button>

        )}

        {onGoDashboard && (

          <button
            onClick={onGoDashboard}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-gray-300 font-bold hover:bg-gray-100 transition"
          >
            <Home size={20} />

            Dashboard

          </button>

        )}

        {onContinue && (

          <button
            onClick={onContinue}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-[#173E7D] text-white font-bold hover:bg-[#0F2E63] transition"
          >
            Continue

            <ArrowRight size={20} />

          </button>

        )}

      </div>

    </div>
  );
}