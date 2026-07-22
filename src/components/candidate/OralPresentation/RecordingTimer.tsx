import { RecordingTimerProps } from "../../../types/oralPresentation";
import {
  formatTime,
  getRecordingProgress,
} from "../../../utils/formatTime";

export default function RecordingTimer({
  duration,
  maxDuration = 120,
}: RecordingTimerProps) {
  const progress = getRecordingProgress(duration, maxDuration);

  return (
    <div className="w-full space-y-3">
      {/* Time */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">
          Recording Time
        </span>

        <span className="font-mono text-xl font-bold text-[#173E7D]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#173E7D] transition-all duration-300"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>0:00</span>

        <span>Maximum {formatTime(maxDuration)}</span>
      </div>
    </div>
  );
}