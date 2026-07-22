import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Video,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
} from "lucide-react";

import oralPresentationService from "../../services/oralPresentation.service";

interface OralPresentation {
  id: string;

  video?: {
    id: string;
    url: string;
  };

  createdAt: string;
  updatedAt: string;
}

export default function OralPresentationCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [presentation, setPresentation] =
    useState<OralPresentation | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPresentation();
  }, []);

  async function loadPresentation() {
    try {
      setLoading(true);

      const data =
        await oralPresentationService.getMyPresentation();

      setPresentation(data);
    } catch (error) {
      console.error(error);
      setPresentation(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      await oralPresentationService.uploadPresentation(file);

      await loadPresentation();
    } catch (err) {
      console.error(err);
      alert("Unable to upload presentation.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete your oral presentation?"
      )
    )
      return;

    try {
      await oralPresentationService.deletePresentation();

      setPresentation(null);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">

      <div className="flex items-center gap-3 mb-6">
        <Video className="text-[#173E7D]" size={28} />

        <div>
          <h2 className="text-xl font-bold text-[#173E7D]">
            Oral Presentation
          </h2>

          <p className="text-sm text-gray-500">
            Recruiters can watch this presentation from your profile.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2
            className="animate-spin text-[#173E7D]"
            size={32}
          />
        </div>
      ) : presentation?.video?.url ? (
        <>
          <div className="rounded-2xl overflow-hidden border">

            <video
              src={presentation.video.url}
              controls
              className="w-full rounded-2xl"
            />

          </div>

          <div className="flex items-center gap-2 mt-4 text-green-600 font-medium">
            <CheckCircle size={18} />

            Presentation uploaded successfully
          </div>

          <div className="flex gap-3 mt-6">

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-5 py-3 rounded-xl bg-[#173E7D] text-white font-semibold hover:bg-blue-900 transition flex items-center gap-2"
            >
              {uploading ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={18} />
              )}

              Replace
            </button>

            <button
              onClick={handleDelete}
              className="px-5 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition flex items-center gap-2"
            >
              <Trash2 size={18} />

              Delete
            </button>

          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">

            <Video
              className="mx-auto mb-4 text-gray-400"
              size={56}
            />

            <h3 className="font-bold text-lg">
              No Oral Presentation
            </h3>

            <p className="text-gray-500 mt-2 mb-6">
              Upload a short introduction video that recruiters
              can watch from your profile.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#173E7D] hover:bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
            >
              {uploading ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Upload size={18} />
              )}

              Upload Presentation
            </button>

          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="video/*"
        onChange={handleUpload}
      />
    </div>
  );
}