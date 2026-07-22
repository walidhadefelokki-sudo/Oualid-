///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface QuizTimerState {
  totalTime: number;
  remainingTime: number;
  elapsedTime: number;
  percentage: number;
  isExpired: boolean;
  isWarning: boolean;
  isCritical: boolean;
}

///////////////////////////////////////////////////////////////
// CONSTANTS
///////////////////////////////////////////////////////////////

export const WARNING_TIME = 5 * 60; // 5 minutes

export const CRITICAL_TIME = 60; // 1 minute

///////////////////////////////////////////////////////////////
// FORMAT TIME
///////////////////////////////////////////////////////////////

export function formatTime(seconds: number): string {

  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = seconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;

}

///////////////////////////////////////////////////////////////
// FORMAT HOURS
///////////////////////////////////////////////////////////////

export function formatLongTime(seconds: number): string {

  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  const secs = seconds % 60;

  if (hours > 0) {

    return `${hours
      .toString()
      .padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;

  }

  return formatTime(seconds);

}

///////////////////////////////////////////////////////////////
// CREATE TIMER
///////////////////////////////////////////////////////////////

export function createTimer(minutes: number): number {

  return minutes * 60;

}

///////////////////////////////////////////////////////////////
// ELAPSED TIME
///////////////////////////////////////////////////////////////

export function getElapsedTime(

  totalTime: number,

  remainingTime: number

): number {

  return totalTime - remainingTime;

}

///////////////////////////////////////////////////////////////
// PERCENTAGE
///////////////////////////////////////////////////////////////

export function getProgress(

  totalTime: number,

  remainingTime: number

): number {

  if (totalTime <= 0) {

    return 100;

  }

  return Math.round(

    ((totalTime - remainingTime) / totalTime) * 100

  );

}

///////////////////////////////////////////////////////////////
// WARNING
///////////////////////////////////////////////////////////////

export function isWarning(

  remainingTime: number

): boolean {

  return (

    remainingTime <= WARNING_TIME &&

    remainingTime > CRITICAL_TIME

  );

}

///////////////////////////////////////////////////////////////
// CRITICAL
///////////////////////////////////////////////////////////////

export function isCritical(

  remainingTime: number

): boolean {

  return remainingTime <= CRITICAL_TIME;

}

///////////////////////////////////////////////////////////////
// EXPIRED
///////////////////////////////////////////////////////////////

export function isExpired(

  remainingTime: number

): boolean {

  return remainingTime <= 0;

}

///////////////////////////////////////////////////////////////
// TIMER STATE
///////////////////////////////////////////////////////////////

export function buildTimerState(

  totalTime: number,

  remainingTime: number

): QuizTimerState {

  return {

    totalTime,

    remainingTime,

    elapsedTime: getElapsedTime(

      totalTime,

      remainingTime

    ),

    percentage: getProgress(

      totalTime,

      remainingTime

    ),

    isExpired: isExpired(

      remainingTime

    ),

    isWarning: isWarning(

      remainingTime

    ),

    isCritical: isCritical(

      remainingTime

    ),

  };

}

///////////////////////////////////////////////////////////////
// CLAMP TIMER
///////////////////////////////////////////////////////////////

export function clampTime(

  remainingTime: number

): number {

  return Math.max(0, remainingTime);

}

///////////////////////////////////////////////////////////////
// DECREASE TIMER
///////////////////////////////////////////////////////////////

export function tick(

  remainingTime: number

): number {

  return clampTime(

    remainingTime - 1

  );

}

///////////////////////////////////////////////////////////////
// ADD TIME
///////////////////////////////////////////////////////////////

export function addTime(

  remainingTime: number,

  seconds: number

): number {

  return remainingTime + seconds;

}

///////////////////////////////////////////////////////////////
// SUBTRACT TIME
///////////////////////////////////////////////////////////////

export function subtractTime(

  remainingTime: number,

  seconds: number

): number {

  return clampTime(

    remainingTime - seconds

  );

}

///////////////////////////////////////////////////////////////
// RESET TIMER
///////////////////////////////////////////////////////////////

export function resetTimer(

  totalTime: number

): number {

  return totalTime;

}

///////////////////////////////////////////////////////////////
// TIMER LABEL
///////////////////////////////////////////////////////////////

export function getTimerLabel(

  remainingTime: number

): string {

  if (isExpired(remainingTime)) {

    return "Time Expired";

  }

  if (isCritical(remainingTime)) {

    return "Less than one minute remaining";

  }

  if (isWarning(remainingTime)) {

    return "Less than five minutes remaining";

  }

  return "Time Remaining";

}

///////////////////////////////////////////////////////////////
// TIMER COLOR
///////////////////////////////////////////////////////////////

export function getTimerColor(

  remainingTime: number

): string {

  if (isExpired(remainingTime)) {

    return "red";

  }

  if (isCritical(remainingTime)) {

    return "red";

  }

  if (isWarning(remainingTime)) {

    return "yellow";

  }

  return "blue";

}

///////////////////////////////////////////////////////////////
// TIMER STATUS
///////////////////////////////////////////////////////////////

export function getTimerStatus(

  remainingTime: number

): "normal" | "warning" | "critical" | "expired" {

  if (isExpired(remainingTime)) {

    return "expired";

  }

  if (isCritical(remainingTime)) {

    return "critical";

  }

  if (isWarning(remainingTime)) {

    return "warning";

  }

  return "normal";

}