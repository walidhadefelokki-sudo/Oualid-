import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Video,
} from "lucide-react";

import { RecordingControlsProps } from "../../../types/oralPresentation";

export default function RecordingControls({
  isRecording,
  isPaused,
  hasRecording,

  onStart,
  onPause,
  onResume,
  onStop,
  onDelete,
}: RecordingControlsProps) {
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm p-6">

      <h2 className="text-lg font-bold text-[#173E7D] mb-5">
        Recording Controls
      </h2>

      <div className="flex flex-wrap gap-4">

        {/* Start Recording */}
        {!isRecording && !hasRecording && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
          >
            <Video size={20} />
            Start Recording
          </button>
        )}

        {/* Pause */}
        {isRecording && !isPaused && (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition"
          >
            <Pause size={20} />
            Pause
          </button>
        )}

        {/* Resume */}
        {isRecording && isPaused && (
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <Play size={20} />
            Resume
          </button>
        )}

        {/* Stop */}
        {isRecording && (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
          >
            <Square size={20} />
            Stop Recording
          </button>
        )}

        {/* Delete */}
        {hasRecording && !isRecording && (
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-red-300 bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition"
          >
            <RotateCcw size={20} />
            Delete Recording
          </button>
        )}

      </div>

      <div className="mt-6 text-sm text-gray-500">
        {isRecording
          ? "Recording is in progress. You can pause or stop at any time."
          : hasRecording
          ? "Your recording is ready. You can preview it or delete it."
          : "Click 'Start Recording' when you're ready."}
      </div>

    </div>
  );
}