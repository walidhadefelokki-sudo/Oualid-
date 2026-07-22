import {
  Brain,
  RefreshCw,
  ArrowLeft,
  FileText,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizEmptyProps {
  title?: string;

  description?: string;

  showRetry?: boolean;

  showBack?: boolean;

  showUploadCV?: boolean;

  onRetry?: () => void;

  onBack?: () => void;

  onUploadCV?: () => void;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizEmpty({
  title = "No Quiz Available",
  description = "We couldn't find any quiz for your current application.",

  showRetry = true,
  showBack = true,
  showUploadCV = false,

  onRetry,
  onBack,
  onUploadCV,
}: QuizEmptyProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">

      {/* Header */}

      <div className="bg-gradient-to-r from-[#173E7D] to-[#2458A8] text-white text-center p-12">

        <div className="flex justify-center">

          <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center">

            <Brain
              size={60}
              className="opacity-90"
            />

          </div>

        </div>

        <h1 className="text-4xl font-black mt-8">

          {title}

        </h1>

        <p className="text-blue-100 mt-4 text-lg max-w-2xl mx-auto">

          {description}

        </p>

      </div>

      {/* Body */}

      <div className="p-10">

        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-8">

          <h2 className="text-2xl font-bold text-[#173E7D]">

            Possible Reasons

          </h2>

          <div className="mt-6 space-y-4">

            <div className="flex items-start gap-4">

              <div className="w-2 h-2 rounded-full bg-[#173E7D] mt-3" />

              <p className="text-gray-700">

                Your CV has not been uploaded yet.

              </p>

            </div>

            <div className="flex items-start gap-4">

              <div className="w-2 h-2 rounded-full bg-[#173E7D] mt-3" />

              <p className="text-gray-700">

                AI is still generating your personalized assessment.

              </p>

            </div>

            <div className="flex items-start gap-4">

              <div className="w-2 h-2 rounded-full bg-[#173E7D] mt-3" />

              <p className="text-gray-700">

                Your recruiter has not enabled the quiz.

              </p>

            </div>

            <div className="flex items-start gap-4">

              <div className="w-2 h-2 rounded-full bg-[#173E7D] mt-3" />

              <p className="text-gray-700">

                An unexpected server error occurred.

              </p>

            </div>

          </div>

        </div>

        {/* Information */}

        <div className="mt-10 rounded-2xl bg-yellow-50 border border-yellow-200 p-8">

          <h3 className="text-xl font-bold text-yellow-700">

            What should you do?

          </h3>

          <div className="mt-5 space-y-4">

            <p className="text-yellow-700">

              • Upload your CV if you haven't already.

            </p>

            <p className="text-yellow-700">

              • Refresh the page after a few moments.

            </p>

            <p className="text-yellow-700">

              • Contact support if the issue continues.

            </p>

          </div>

        </div>

      </div>

      {/* Footer */}

      <div className="border-t border-gray-200 p-8 flex flex-wrap justify-center gap-4">

        {showRetry && (

          <button
            onClick={onRetry}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#173E7D] text-white font-bold hover:bg-[#0E2E61] transition"
          >
            <RefreshCw size={20} />

            Retry

          </button>

        )}

        {showUploadCV && (

          <button
            onClick={onUploadCV}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-[#173E7D] text-[#173E7D] font-bold hover:bg-blue-50 transition"
          >
            <FileText size={20} />

            Upload CV

          </button>

        )}

        {showBack && (

          <button
            onClick={onBack}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-gray-300 font-bold hover:bg-gray-100 transition"
          >
            <ArrowLeft size={20} />

            Back

          </button>

        )}

      </div>

    </div>
  );
}