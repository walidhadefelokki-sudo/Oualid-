// ======================================================
// Dar L'Emploi
// Oral Presentation Types
// ======================================================

/**
 * Current recording state
 */
export interface OralPresentationState {
  stream: MediaStream | null;
  videoBlob: Blob | null;
  videoURL: string;

  isCameraReady: boolean;
  isRecording: boolean;
  isPaused: boolean;
  isUploading: boolean;

  duration: number;

  error: string | null;
}

/**
 * Upload response returned by Cloudinary
 */
export interface OralPresentationUploadResponse {
  success: boolean;
  url: string;
  publicId: string;
}

/**
 * Component props
 */
export interface OralPresentationProps {
  /**
   * Called after successful upload.
   * Returns the Cloudinary URL.
   */
  onUploaded?: (url: string) => void;

  /**
   * Maximum recording duration (seconds).
   * Default: 120
   */
  maxDuration?: number;
}

/**
 * Camera preview props
 */
export interface CameraPreviewProps {
  stream: MediaStream | null;
}

/**
 * Video preview props
 */
export interface VideoPreviewProps {
  videoURL: string;

  onDelete: () => void;
}

/**
 * Recording timer props
 */
export interface RecordingTimerProps {
  duration: number;

  maxDuration?: number;
}

/**
 * Recording controls props
 */
export interface RecordingControlsProps {
  isRecording: boolean;

  isPaused: boolean;

  hasRecording: boolean;

  onStart: () => void;

  onPause: () => void;

  onResume: () => void;

  onStop: () => void;

  onDelete: () => void;
}

/**
 * Recording status props
 */
export interface RecordingStatusProps {
  isRecording: boolean;

  isPaused: boolean;

  isCameraReady: boolean;
}

/**
 * Upload progress props
 */
export interface UploadProgressProps {
  progress: number;
}

/**
 * Permission error props
 */
export interface PermissionErrorProps {
  message: string;

  onRetry: () => void;
}

/**
 * Cloudinary upload payload
 */
export interface OralPresentationUploadPayload {
  file: File;
}

/**
 * API request when candidate applies
 */
export interface OralPresentationApplicationPayload {
  candidateId: string;

  jobId: string;

  cvUrl: string;

  oralPresentationUrl: string;
}