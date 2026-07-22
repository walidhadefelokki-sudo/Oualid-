/**
 * =====================================================
 * Dar L'Emploi
 * Time Formatting Utilities
 * =====================================================
 */

/**
 * Converts seconds into MM:SS format.
 *
 * Examples:
 * 0    -> 00:00
 * 5    -> 00:05
 * 65   -> 01:05
 * 120  -> 02:00
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Converts seconds into HH:MM:SS format.
 *
 * Examples:
 * 45    -> 00:00:45
 * 125   -> 00:02:05
 * 3725  -> 01:02:05
 */
export function formatTimeLong(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    remainingSeconds.toString().padStart(2, "0"),
  ].join(":");
}

/**
 * Returns the recording progress percentage.
 *
 * Example:
 * duration = 30
 * maxDuration = 120
 * => 25
 */
export function getRecordingProgress(
  duration: number,
  maxDuration: number
): number {
  if (maxDuration <= 0) return 0;

  return Math.min((duration / maxDuration) * 100, 100);
}

/**
 * Returns true if the maximum recording duration
 * has been reached.
 */
export function hasReachedMaxDuration(
  duration: number,
  maxDuration: number
): boolean {
  return duration >= maxDuration;
}