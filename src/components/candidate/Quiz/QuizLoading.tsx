import {
  Brain,
  Loader2,
  Sparkles,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizLoadingProps {
  title?: string;
  description?: string;
  progress?: number;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizLoading({
  title = "Preparing Your AI Assessment",
  description = "Our AI is analyzing your CV and generating personalized questions.",
  progress,
}: QuizLoadingProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">

      {/* Header */}

      <div className="bg-[#173E7D] text-white p-10 text-center">

        <div className="flex justify-center">

          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">

            <Brain
              size={52}
              className="animate-pulse"
            />

          </div>

        </div>

        <h1 className="text-4xl font-black mt-6">

          {title}

        </h1>

        <p className="text-blue-100 mt-4 text-lg">

          {description}

        </p>

      </div>

      {/* Body */}

      <div className="p-10">

        {/* Animated Icon */}

        <div className="flex justify-center">

          <Loader2
            size={60}
            className="animate-spin text-[#173E7D]"
          />

        </div>

        {/* Steps */}

        <div className="mt-10 space-y-6">

          <div className="flex items-center gap-4">

            <Sparkles
              size={24}
              className="text-yellow-500"
            />

            <span className="text-gray-700">

              Reading your CV...

            </span>

          </div>

          <div className="flex items-center gap-4">

            <Sparkles
              size={24}
              className="text-yellow-500"
            />

            <span className="text-gray-700">

              Identifying your skills...

            </span>

          </div>

          <div className="flex items-center gap-4">

            <Sparkles
              size={24}
              className="text-yellow-500"
            />

            <span className="text-gray-700">

              Generating personalized questions...

            </span>

          </div>

          <div className="flex items-center gap-4">

            <Sparkles
              size={24}
              className="text-yellow-500"
            />

            <span className="text-gray-700">

              Preparing your assessment...

            </span>

          </div>

        </div>

        {/* Progress */}

        {progress !== undefined && (

          <div className="mt-12">

            <div className="flex justify-between mb-3">

              <span className="text-gray-500">

                Progress

              </span>

              <span className="font-bold text-[#173E7D]">

                {progress}%

              </span>

            </div>

            <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">

              <div
                className="h-full bg-[#173E7D] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        )}

        {/* Footer */}

        <div className="mt-12 text-center">

          <p className="text-gray-500">

            This usually takes only a few seconds.

          </p>

        </div>

      </div>

    </div>
  );
}