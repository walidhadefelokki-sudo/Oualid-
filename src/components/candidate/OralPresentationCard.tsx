import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Video,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  Languages,
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

export default function OralPresentationCard({ isDemo = false }: { isDemo?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [presentation, setPresentation] =
    useState<OralPresentation | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isDemo) {
      // Demo accounts don't have a real backend session/token, so calling
      // the real API here would always fail with 401. Just show the
      // empty state instead of a doomed network request.
      setLoading(false);
      return;
    }
    loadPresentation();
  }, [isDemo]);

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

    if (isDemo) {
      alert("Créez un compte pour téléverser une présentation orale.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      await oralPresentationService.uploadPresentation(file, setUploadProgress);

      await loadPresentation();
    } catch (err: any) {
      console.error(err);
      alert(
        `Impossible de téléverser la présentation.\n\n${err?.message || "Erreur inconnue."}`
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Supprimer votre présentation orale ?"
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
            Présentation orale
          </h2>

          <p className="text-sm text-gray-500">
            Les recruteurs peuvent visionner cette présentation depuis votre profil.
          </p>
        </div>
      </div>

      {/* The presentation must be in Arabic. Stated before the upload control
          because recording in the wrong language means redoing the whole
          video — it has to be read before the candidate picks a file. */}
      <div className="flex gap-3 items-start rounded-xl border border-[#F68D58]/30 bg-[#F68D58]/10 p-4 mb-5">
        <Languages className="text-[#F68D58] mt-0.5 shrink-0" size={20} />
        <div>
          <p className="font-bold text-[#173E7D] text-sm">
            Présentation vidéo en arabe
          </p>
          <p className="text-gray-700 text-sm mt-0.5">
            Votre présentation doit être enregistrée <span className="font-semibold">en arabe</span>.
          </p>
          <p className="text-gray-700 text-sm mt-1" dir="rtl" lang="ar">
            يجب تسجيل عرضك التقديمي باللغة العربية.
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

            Présentation téléversée avec succès
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#173E7D] transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          )}

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

              Remplacer
            </button>

            <button
              onClick={handleDelete}
              disabled={uploading}
              className="px-5 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition flex items-center gap-2"
            >
              <Trash2 size={18} />

              Supprimer
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
              Aucune présentation orale
            </h3>

            <p className="text-gray-500 mt-2 mb-6">
              Téléversez une courte vidéo de présentation que les recruteurs
              pourront visionner depuis votre profil.
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

              Téléverser une présentation
            </button>

            {uploading && (
              <div className="mt-4 max-w-xs mx-auto">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#173E7D] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            )}

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