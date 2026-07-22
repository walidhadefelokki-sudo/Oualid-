import {
  AlertTriangle,
  RefreshCw,
  Camera,
  Mic,
} from "lucide-react";

import {
  PermissionErrorProps,
} from "../../../types/oralPresentation";

export default function PermissionError({
  message,
  onRetry,
}: PermissionErrorProps) {
  return (
    <div className="w-full rounded-2xl border border-red-200 bg-red-50 shadow-sm overflow-hidden">

      {/* Header */}

      <div className="flex items-center gap-4 p-6 border-b border-red-200">

        <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">

          <AlertTriangle
            className="text-white"
            size={28}
          />

        </div>

        <div>

          <h2 className="text-xl font-bold text-red-700">
            Camera Permission Required
          </h2>

          <p className="text-red-600 text-sm mt-1">
            We couldn't access your camera or microphone.
          </p>

        </div>

      </div>

      {/* Error Message */}

      <div className="p-6">

        <div className="rounded-xl bg-white border border-red-100 p-4">

          <p className="text-gray-700">

            {message}

          </p>

        </div>

      </div>

      {/* Possible Causes */}

      <div className="px-6">

        <h3 className="font-bold text-[#173E7D] mb-4">

          Possible causes

        </h3>

        <div className="space-y-3">

          <div className="flex gap-3">

            <Camera
              className="text-[#173E7D] mt-1"
              size={20}
            />

            <p className="text-gray-600 text-sm">

              Camera permission has been denied.

            </p>

          </div>

          <div className="flex gap-3">

            <Mic
              className="text-[#173E7D] mt-1"
              size={20}
            />

            <p className="text-gray-600 text-sm">

              Microphone permission has been denied.

            </p>

          </div>

          <div className="flex gap-3">

            <AlertTriangle
              className="text-[#173E7D] mt-1"
              size={20}
            />

            <p className="text-gray-600 text-sm">

              Another application is already using your camera.

            </p>

          </div>

          <div className="flex gap-3">

            <AlertTriangle
              className="text-[#173E7D] mt-1"
              size={20}
            />

            <p className="text-gray-600 text-sm">

              Your browser may not support video recording.

            </p>

          </div>

        </div>

      </div>

      {/* Browser Tips */}

      <div className="mx-6 mt-6 rounded-xl bg-blue-50 border border-blue-200 p-5">

        <h3 className="font-bold text-[#173E7D] mb-3">

          Recommended browsers

        </h3>

        <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">

          <li>Google Chrome (Recommended)</li>

          <li>Microsoft Edge</li>

          <li>Mozilla Firefox</li>

          <li>Safari (Latest version)</li>

        </ul>

      </div>

      {/* Retry */}

      <div className="p-6">

        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-3 bg-[#173E7D] text-white py-4 rounded-xl font-semibold hover:bg-[#0f2f62] transition"
        >

          <RefreshCw size={20} />

          Try Again

        </button>

      </div>

    </div>
  );
}