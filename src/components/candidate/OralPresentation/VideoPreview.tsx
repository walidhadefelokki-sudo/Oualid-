import { Eye, Trash2, Video } from "lucide-react";
import { VideoPreviewProps } from "../../../types/oralPresentation";

export default function VideoPreview({
  videoURL,
  onDelete,
}: VideoPreviewProps) {
  if (!videoURL) return null;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}

      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-full bg-[#173E7D] flex items-center justify-center">

            <Video
              className="text-white"
              size={20}
            />

          </div>

          <div>

            <h2 className="text-lg font-bold text-[#173E7D]">
              Recording Preview
            </h2>

            <p className="text-sm text-gray-500">
              Review your presentation before uploading.
            </p>

          </div>

        </div>

        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition"
        >
          <Trash2 size={18} />

          Delete
        </button>

      </div>

      {/* Video */}

      <div className="bg-black">

        <video
          src={videoURL}
          controls
          controlsList="nodownload"
          className="w-full aspect-video"
        />

      </div>

      {/* Footer */}

      <div className="px-6 py-5 bg-gray-50">

        <div className="flex items-start gap-3">

          <Eye
            size={20}
            className="text-[#173E7D] mt-1"
          />

          <div>

            <h3 className="font-semibold text-gray-800">
              Preview your recording
            </h3>

            <p className="text-sm text-gray-500 mt-1">

              Watch your presentation carefully.

              If you're satisfied, you can continue to upload it.

              Otherwise, delete it and record a new version.

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}