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
  // Placeholder
  // Phase 5
  /////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////
// Upload
/////////////////////////////////////////////////////////////

const handleUpload = async () => {
  if (!videoBlob) return;

  try {
    setIsUploading(true);
    setUploadProgress(0);

    ////////////////////////////////////////////////////////
    // Phase 5
    // Replace this fake upload by Cloudinary
    ////////////////////////////////////////////////////////

    for (let progress = 0; progress <= 100; progress += 5) {
      await new Promise((resolve) => setTimeout(resolve, 70));

      setUploadProgress(progress);
    }

    ////////////////////////////////////////////////////////

    const fakeCloudinaryURL =
      "https://cloudinary.com/demo/oral-presentation.webm";

    setUploadedURL(fakeCloudinaryURL);

    onUploaded?.(fakeCloudinaryURL);
  } catch (error) {
    console.error("Upload failed", error);

    alert("Unable to upload the presentation.");
  } finally {
    setIsUploading(false);
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

    {uploadedURL && (

        <div className="rounded-3xl bg-blue-50 border border-blue-200 p-6">

        <h2 className="font-bold text-[#173E7D]">

            ✅ Presentation Uploaded Successfully

        </h2>

        <p className="text-gray-600 mt-2">

            Your oral presentation has been uploaded successfully.

        </p>

        </div>

    )}

    -
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

