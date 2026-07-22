import { Clock, AlertTriangle } from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizTimerProps {
  timeRemaining: number;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizTimer({
  timeRemaining,
}: QuizTimerProps) {
  /////////////////////////////////////////////////////////////
  // FORMAT TIME
  /////////////////////////////////////////////////////////////

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  /////////////////////////////////////////////////////////////
  // WARNING STATES
  /////////////////////////////////////////////////////////////

  const isCritical = timeRemaining <= 60;

  const isWarning =
    timeRemaining > 60 &&
    timeRemaining <= 300;

  /////////////////////////////////////////////////////////////
  // COLORS
  /////////////////////////////////////////////////////////////

  const containerClass = isCritical
    ? "bg-red-50 border-red-300"
    : isWarning
    ? "bg-yellow-50 border-yellow-300"
    : "bg-white border-gray-200";

  const iconColor = isCritical
    ? "text-red-600"
    : isWarning
    ? "text-yellow-600"
    : "text-[#173E7D]";

  const timeColor = isCritical
    ? "text-red-600"
    : isWarning
    ? "text-yellow-600"
    : "text-[#173E7D]";

  /////////////////////////////////////////////////////////////

  return (
    <div
      className={`rounded-3xl border shadow-sm p-6 ${containerClass}`}
    >
      {/* Header */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <Clock
            size={28}
            className={`${iconColor} ${
              isCritical ? "animate-pulse" : ""
            }`}
          />

          <div>

            <h2 className="text-lg font-bold text-gray-800">
              Remaining Time
            </h2>

            <p className="text-sm text-gray-500">
              The quiz will automatically submit when time expires.
            </p>

          </div>

        </div>

        {(isWarning || isCritical) && (
          <AlertTriangle
            size={28}
            className={`${iconColor} ${
              isCritical ? "animate-bounce" : ""
            }`}
          />
        )}

      </div>

      {/* Time */}

      <div className="mt-8 text-center">

        <h1
          className={`font-mono text-6xl font-black ${timeColor}`}
        >
          {formatTime(timeRemaining)}
        </h1>

      </div>

      {/* Status */}

      <div className="mt-8">

        {isCritical ? (
          <div className="rounded-xl bg-red-100 border border-red-300 p-4 text-center">

            <p className="font-bold text-red-700">
              Less than 1 minute remaining!
            </p>

          </div>
        ) : isWarning ? (
          <div className="rounded-xl bg-yellow-100 border border-yellow-300 p-4 text-center">

            <p className="font-semibold text-yellow-700">
              Hurry! Less than 5 minutes remaining.
            </p>

          </div>
        ) : (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">

            <p className="text-[#173E7D] font-medium">
              Take your time and read each question carefully.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}