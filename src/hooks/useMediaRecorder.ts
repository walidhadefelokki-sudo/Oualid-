import { useState, useRef, useEffect } from "react";

const MAX_DURATION = 120; // seconds (2 minutes)

export interface MediaRecorderHook {
  stream: MediaStream | null;
  videoBlob: Blob | null;
  videoURL: string;
  isRecording: boolean;
  isPaused: boolean;
  isCameraReady: boolean;
  loading: boolean;
  error: string | null;
  duration: number;

  startCamera: () => Promise<void>;
  stopCamera: () => void;

  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;

  resetRecording: () => void;
}

export default function useMediaRecorder(): MediaRecorderHook {
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const [videoURL, setVideoURL] = useState("");

  const [isRecording, setIsRecording] = useState(false);

  const [isPaused, setIsPaused] = useState(false);

  const [isCameraReady, setIsCameraReady] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  ////////////////////////////////////////////////////////////////

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration((previous) => {
        if (previous + 1 >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }

        return previous + 1;
      });
    }, 1000);
  };

  ////////////////////////////////////////////////////////////////

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  ////////////////////////////////////////////////////////////////

  const startCamera = async () => {
    try {
      setLoading(true);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setIsCameraReady(true);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to access your camera or microphone. Please allow permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  ////////////////////////////////////////////////////////////////

  const stopCamera = () => {
    if (!stream) return;

    stream.getTracks().forEach((track) => track.stop());

    setStream(null);

    setIsCameraReady(false);
  };

  ////////////////////////////////////////////////////////////////

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);

    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: "video/webm",
      });

      const url = URL.createObjectURL(blob);

      setVideoBlob(blob);

      setVideoURL(url);
    };

    recorder.start();

    setDuration(0);

    setIsRecording(true);

    setIsPaused(false);

    startTimer();
  };

  ////////////////////////////////////////////////////////////////

  const pauseRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.pause();

    setIsPaused(true);

    stopTimer();
  };

  ////////////////////////////////////////////////////////////////

  const resumeRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.resume();

    setIsPaused(false);

    startTimer();
  };

  ////////////////////////////////////////////////////////////////

  const stopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stop();

    stopTimer();

    setIsRecording(false);

    setIsPaused(false);
  };

  ////////////////////////////////////////////////////////////////

  const resetRecording = () => {
    stopTimer();

    if (videoURL) {
      URL.revokeObjectURL(videoURL);
    }

    setVideoBlob(null);

    setVideoURL("");

    setDuration(0);

    setIsRecording(false);

    setIsPaused(false);

    chunksRef.current = [];
  };

  ////////////////////////////////////////////////////////////////

  useEffect(() => {
    return () => {
      stopCamera();

      stopTimer();

      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, []);

  ////////////////////////////////////////////////////////////////

  return {
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
  };
}