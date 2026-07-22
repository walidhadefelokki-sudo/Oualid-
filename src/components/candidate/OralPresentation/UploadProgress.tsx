import { CloudUpload, CheckCircle2, Loader2 } from "lucide-react";
import { UploadProgressProps } from "../../../types/oralPresentation";

export default function UploadProgress({
  progress,
}: UploadProgressProps) {
  const isCompleted = progress >= 100;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm p-6">

      {/* Header */}

      <div className="flex items-center gap-3 mb-6">

        <div className="w-12 h-12 rounded-full bg-[#173E7D] flex items-center justify-center">

          {isCompleted ? (
            <CheckCircle2 className="text-white" size={24} />
          ) : (
            <CloudUpload className="text-white" size={24} />
          )}

        </div>

        <div>

          <h2 className="text-lg font-bold text-[#173E7D]">

            {isCompleted
              ? "Upload Complete"
              : "Uploading Presentation"}

          </h2>

          <p className="text-sm text-gray-500">

            {isCompleted
              ? "Your oral presentation has been uploaded successfully."
              : "Please wait while your video is being uploaded."}

          </p>

        </div>

      </div>

      {/* Progress Bar */}

      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">

        <div
          className={`h-full transition-all duration-500 ${
            isCompleted
              ? "bg-green-500"
              : "bg-[#173E7D]"
          }`}
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      {/* Footer */}

      <div className="flex justify-between items-center mt-4">

        <span className="text-sm font-medium text-gray-600">

          {progress.toFixed(0)}%

        </span>

        {!isCompleted && (
          <div className="flex items-center gap-2 text-[#173E7D]">

            <Loader2
              className="animate-spin"
              size={18}
            />

            <span className="text-sm font-medium">

              Uploading...

            </span>

          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 text-green-600">

            <CheckCircle2 size={18} />

            <span className="text-sm font-medium">

              Completed

            </span>

          </div>
        )}

      </div>

    </div>
  );
}