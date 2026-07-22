import { useEffect, useRef } from "react";
import { CameraPreviewProps } from "../../../types/oralPresentation";

export default function CameraPreview({
  stream,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (stream) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />
      ) : (
        <div className="w-full aspect-video flex flex-col items-center justify-center text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-16 h-16 mb-4 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h8a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>

          <p className="text-lg font-semibold">
            Camera not started
          </p>

          <p className="text-sm text-gray-400 mt-2">
            Click "Start Camera" to begin your oral presentation.
          </p>
        </div>
      )}
    </div>
  );
}