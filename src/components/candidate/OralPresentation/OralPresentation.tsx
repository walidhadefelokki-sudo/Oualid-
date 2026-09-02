import { useEffect, useState } from "react";

import useMediaRecorder from "../../../hooks/useMediaRecorder";

import {
  CameraPreview,
  RecordingControls,
  RecordingInstructions,
  RecordingStatus,
  RecordingTimer,
  UploadProgress,
  PermissionError,
  VideoPreview,
} from "./";

import {
  OralPresentationProps,
} from "../../../types/oralPresentation";

import oralPresentationService from "../../../services/oralPresentation.service";

export default function OralPresentation({
  onUploaded,
  maxDuration = 120,
}: OralPresentationProps) {

  /////////////////////////////////////////////////////////////
  // Recording Hook
  /////////////////////////////////////////////////////////////

  const {
    stream,

    videoBlob,

    videoURL,

    isRecording,

    isPaused,

    isCameraReady,

    loading,

    error,

    duration,

    startCamera,

    stopCamera,

    startRecording,

    pauseRecording,

    resumeRecording,

    stopRecording,

    resetRecording,

  } = useMediaRecorder();

  /////////////////////////////////////////////////////////////
  // Upload State
  /////////////////////////////////////////////////////////////

  const [uploadProgress, setUploadProgress] = useState(0);

  const [isUploading, setIsUploading] = useState(false);

  const [uploadedURL, setUploadedURL] = useState("");

  // Surfaced in the UI instead of an alert(), so a failed upload explains
  // itself in place — the service already reports which stage failed
  // ([signature], [cloudinary], [save]).
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // True once we know whether a presentation already exists on the profile.
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  /////////////////////////////////////////////////////////////
  // Camera Initialization
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    startCamera();

    return () => {

      stopCamera();

    };

  }, []);

  /////////////////////////////////////////////////////////////
  // Existing presentation
  //
  // The presentation belongs to the CandidateProfile, so a candidate who
  // already recorded one should see it rather than an empty recorder.
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    let cancelled = false;

    oralPresentationService
      .getMyPresentation()
      .then((presentation) => {
        if (!cancelled && presentation?.video?.url) {
          setUploadedURL(presentation.video.url);
        }
      })
      .catch((err) => {
        // A candidate with no presentation yet is the normal case; only real
        // failures are worth logging, and none should block recording.
        console.error("Could not load existing presentation:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };

  }, []);

  /////////////////////////////////////////////////////////////
  // Button Actions
  /////////////////////////////////////////////////////////////

  const handleStartRecording = () => {

    startRecording();

  };

  /////////////////////////////////////////////////////////////

  const handlePauseRecording = () => {

    pauseRecording();

  };

  /////////////////////////////////////////////////////////////

  const handleResumeRecording = () => {

    resumeRecording();

  };

  /////////////////////////////////////////////////////////////

  const handleStopRecording = () => {

    stopRecording();

  };

  /////////////////////////////////////////////////////////////

  const handleDeleteRecording = () => {

    resetRecording();

    setUploadProgress(0);

    setUploadedURL("");

  };

/////////////////////////////////////////////////////////////
// Upload (Cloudinary)
/////////////////////////////////////////////////////////////

const handleUpload = async () => {
  if (!videoBlob) return;

  try {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    // The recorder produces a Blob; Cloudinary needs a named File so it can
    // infer the extension. webm is what MediaRecorder emits in Chrome and
    // Firefox, and it is in the allowed formats for the presentations folder.
    const extension = (videoBlob.type.split("/")[1] || "webm").split(";")[0];
    const file = new File([videoBlob], `presentation.${extension}`, {
      type: videoBlob.type || "video/webm",
    });

    // Uploads straight from the browser to Cloudinary using a short-lived
    // signature, then saves only the resulting metadata on our API — a video
    // would exceed the serverless request body limit if routed through it.
    const presentation = await oralPresentationService.uploadPresentation(
      file,
      setUploadProgress
    );

    const url = presentation.video?.url ?? "";
    setUploadedURL(url);
    onUploaded?.(url);
  } catch (error: any) {
    console.error("Upload failed", error);
    setUploadError(
      error?.message ||
        "Le téléversement de la présentation a échoué. Veuillez réessayer."
    );
  } finally {
    setIsUploading(false);
  }
};

/////////////////////////////////////////////////////////////
// Replace / delete an already-saved presentation
/////////////////////////////////////////////////////////////

const handleDeleteSaved = async () => {
  if (!window.confirm("Supprimer votre présentation enregistrée ?")) return;

  try {
    setIsDeleting(true);
    setUploadError(null);
    await oralPresentationService.deletePresentation();
    setUploadedURL("");
    setUploadProgress(0);
    resetRecording();
  } catch (error: any) {
    console.error("Delete failed", error);
    setUploadError(
      error?.response?.data?.message ||
        error?.message ||
        "Impossible de supprimer la présentation."
    );
  } finally {
    setIsDeleting(false);
  }
};

/////////////////////////////////////////////////////////////
// Helpers
/////////////////////////////////////////////////////////////

const hasRecording = !!videoBlob;

const canRecord =
  isCameraReady &&
  !isRecording &&
  !loading;

const canUpload =
  hasRecording &&
  !isUploading &&
  uploadedURL === "";



  /////////////////////////////////////////////////////////////
  // Component
  /////////////////////////////////////////////////////////////

  return (

    <div className="w-full max-w-5xl mx-auto space-y-8">

  {/* ================================================= */}
  {/* Header */}
  {/* ================================================= */}

  <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">

    <h1 className="text-3xl font-black text-[#173E7D]">

      Oral Presentation

    </h1>

    <p className="text-gray-500 mt-2">

      Record a short presentation to strengthen your application.

      Recruiters can watch your presentation together with your CV.

    </p>

  </div>

  {/* ================================================= */}
  {/* Instructions */}
  {/* ================================================= */}

  <RecordingInstructions />

  {/* ================================================= */}
  {/* Permission Error */}
  {/* ================================================= */}

  {error && (

    <PermissionError

      message={error}

      onRetry={startCamera}

    />

  )}

  {/* ================================================= */}
  {/* Camera */}
  {/* ================================================= */}

  {!error && (

    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-6">

      <CameraPreview

        stream={stream}

      />

      {/* Status */}

      <RecordingStatus

        isRecording={isRecording}

        isPaused={isPaused}

        isCameraReady={isCameraReady}

      />

      {/* Timer */}

      <RecordingTimer

        duration={duration}

        maxDuration={maxDuration}

      />

      {/* Controls */}

      <RecordingControls

        isRecording={isRecording}

        isPaused={isPaused}

        hasRecording={hasRecording}

        onStart={handleStartRecording}

        onPause={handlePauseRecording}

        onResume={handleResumeRecording}

        onStop={handleStopRecording}

        onDelete={handleDeleteRecording}

      />

    </div>

  )}

  {/* ================================================= */}
  {/* Video Preview */}
  {/* ================================================= */}

  {videoURL && (

    <VideoPreview

      videoURL={videoURL}

      onDelete={handleDeleteRecording}

    />

  )}

  {/* ================================================= */}
  {/* Upload Progress */}
  {/* ================================================= */}

  {isUploading && (

    <UploadProgress

      progress={uploadProgress}

    />

  )}

  {/* ================================================= */}
  {/* Recording Summary */}
  {/* ================================================= */}

  {videoBlob && !isUploading && (

    <div className="rounded-3xl border border-green-200 bg-green-50 p-6">

        <div className="flex items-center gap-3">

            <div className="w-4 h-4 rounded-full bg-green-500" />

            <div>

            <h2 className="font-bold text-green-700">

                Recording Ready

            </h2>

            <p className="text-sm text-green-600">

                Your oral presentation has been successfully recorded.

            </p>

            </div>

        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">

            <div>

            <p className="text-sm text-gray-500">

                Duration

            </p>

            <p className="font-bold text-[#173E7D]">

                {Math.floor(duration / 60)
                .toString()
                .padStart(2, "0")}

                :

                {(duration % 60)
                .toString()
                .padStart(2, "0")}

            </p>

            </div>

            <div>

            <p className="text-sm text-gray-500">

                Status

            </p>

            <p className="font-bold text-green-600">

                Ready for upload

            </p>

            </div>

        </div>

        </div>

    )}

    {/* ================================================= */}
    {/* Upload Button */}
    {/* ================================================= */}

    {videoBlob && !isUploading && !uploadedURL && (

        <div className="flex justify-end">

        <button

            onClick={handleUpload}

            disabled={!canUpload}

            className="px-8 py-4 rounded-2xl bg-[#173E7D] text-white font-bold hover:bg-[#0E2E61] transition disabled:opacity-50"

        >

            Upload Presentation

        </button>

        </div>

    )}

    {/* ================================================= */}
    {/* Success */}
    {/* ================================================= */}

    {uploadError && (

        <div className="rounded-3xl bg-red-50 border border-red-200 p-6">

        <h2 className="font-bold text-red-700">

            Le téléversement a échoué

        </h2>

        <p className="text-red-600/90 mt-2 text-sm break-words">

            {uploadError}

        </p>

        </div>

    )}

    {uploadedURL && (

        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-6 space-y-4">

        <div>

            <h2 className="font-bold text-emerald-800">

                Présentation enregistrée

            </h2>

            <p className="text-emerald-700/80 mt-1 text-sm">

                Votre présentation est enregistrée sur votre profil. Les recruteurs
                autorisés peuvent la consulter.

            </p>

        </div>

        {/* The saved video, so the candidate can check what recruiters will see. */}
        <video
            src={uploadedURL}
            controls
            playsInline
            className="w-full rounded-2xl bg-black max-h-80"
        />

        <div className="flex flex-wrap gap-3">

            <button
                onClick={handleDeleteRecording}
                className="px-6 py-3 rounded-2xl bg-[#173E7D] text-white font-bold hover:bg-[#0E2E61] transition"
            >
                Réenregistrer
            </button>

            <button
                onClick={handleDeleteSaved}
                disabled={isDeleting}
                className="px-6 py-3 rounded-2xl bg-white text-red-600 border border-red-200 font-bold hover:bg-red-50 transition disabled:opacity-50"
            >
                {isDeleting ? "Suppression…" : "Supprimer"}
            </button>

        </div>

        </div>

    )}

    {/* ================================================= */}

        <div className="text-center py-10">

        <p className="text-gray-400 text-sm">

            Dar L'Emploi

            •

            Oral Presentation Module

            •

            Version 1.0

        </p>

        </div>
    </div>

  );

}

