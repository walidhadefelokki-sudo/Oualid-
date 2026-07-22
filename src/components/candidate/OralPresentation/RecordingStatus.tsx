import { RecordingStatusProps } from "../../../types/oralPresentation";

export default function RecordingStatus({
  isRecording,
  isPaused,
  isCameraReady,
}: RecordingStatusProps) {
  const getStatus = () => {
    // Camera not started
    if (!isCameraReady) {
      return {
        color: "bg-gray-500",
        textColor: "text-gray-600",
        title: "Camera Off",
        description: "Start the camera to begin your oral presentation.",
      };
    }

    // Recording paused
    if (isPaused) {
      return {
        color: "bg-yellow-500",
        textColor: "text-yellow-700",
        title: "Recording Paused",
        description: "Resume recording whenever you're ready.",
      };
    }

    // Recording in progress
    if (isRecording) {
      return {
        color: "bg-red-500 animate-pulse",
        textColor: "text-red-700",
        title: "Recording...",
        description: "Your oral presentation is currently being recorded.",
      };
    }

    // Camera ready
    return {
      color: "bg-green-500",
      textColor: "text-green-700",
      title: "Ready",
      description: "Press 'Start Recording' when you're ready.",
    };
  };

  const status = getStatus();

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border bg-white shadow-sm">
      {/* Status Dot */}
      <div
        className={`w-4 h-4 rounded-full mt-1 ${status.color}`}
      />

      {/* Status Text */}
      <div className="flex-1">
        <h3 className={`font-bold ${status.textColor}`}>
          {status.title}
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          {status.description}
        </p>
      </div>
    </div>
  );
}