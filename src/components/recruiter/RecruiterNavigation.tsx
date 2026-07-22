import { useEffect, useState } from "react";
import {
  Loader2,
  Video,
  Calendar,
  Star,
  Save,
  User,
} from "lucide-react";

import oralPresentationService from "../../services/oralPresentation.service";

interface Props {
  candidateId: string;
}

interface OralPresentation {
  id: string;

  videoUrl: string;

  transcript?: string;

  recruiterScore?: number;

  aiScore?: number;

  createdAt: string;

  updatedAt: string;

  candidate?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function OralPresentationViewer({
  candidateId,
}: Props) {
  const [presentation, setPresentation] =
    useState<OralPresentation | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [score, setScore] = useState(0);

  useEffect(() => {
    loadPresentation();
  }, [candidateId]);

  async function loadPresentation() {
    try {
      setLoading(true);

      const data =
        await oralPresentationService.getCandidatePresentation(
          candidateId
        );

      setPresentation(data);

      setScore(data?.recruiterScore || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveRecruiterScore() {
    if (!presentation) return;

    try {
      setSaving(true);

      await oralPresentationService.updateRecruiterScore(
        presentation.id,
        score
      );

      setPresentation({
        ...presentation,
        recruiterScore: score,
      });
    } catch (err) {
      console.error(err);
      alert("Unable to save score.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2
          className="animate-spin text-[#173E7D]"
          size={40}
        />
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="text-center py-16">

        <Video
          size={70}
          className="mx-auto text-gray-300 mb-6"
        />

        <h3 className="text-2xl font-bold text-gray-700">
          No Oral Presentation
        </h3>

        <p className="text-gray-500 mt-2">
          This candidate has not uploaded an oral presentation.
        </p>

      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Candidate */}

      <div className="flex items-center gap-4">

        <div className="w-16 h-16 rounded-full bg-[#173E7D] text-white flex items-center justify-center">

          <User size={28} />

        </div>

        <div>

          <h2 className="text-2xl font-black text-[#173E7D]">
            {presentation.candidate?.firstName}{" "}
            {presentation.candidate?.lastName}
          </h2>

          <p className="text-gray-500">
            {presentation.candidate?.email}
          </p>

        </div>

      </div>

      {/* Video */}

      <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm">

        <video
          controls
          className="w-full bg-black"
          src={presentation.videoUrl}
        />

      </div>

      {/* Information */}

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-gray-50 rounded-2xl p-5">

          <div className="flex items-center gap-2 mb-2">

            <Calendar
              size={18}
              className="text-[#173E7D]"
            />

            <span className="font-bold">
              Uploaded
            </span>

          </div>

          <p className="text-gray-600">
            {new Date(
              presentation.createdAt
            ).toLocaleString()}
          </p>

        </div>

        <div className="bg-gray-50 rounded-2xl p-5">

          <div className="flex items-center gap-2 mb-2">

            <Star
              size={18}
              className="text-[#173E7D]"
            />

            <span className="font-bold">
              AI Score
            </span>

          </div>

          <p className="text-2xl font-black text-[#173E7D]">
            {presentation.aiScore ?? "-"}%
          </p>

        </div>

      </div>

      {/* Recruiter Score */}

      <div className="border rounded-3xl p-6">

        <h3 className="font-black text-xl mb-5 flex items-center gap-2">

          <Star
            size={22}
            className="text-yellow-500"
          />

          Recruiter Evaluation

        </h3>

        <div className="flex flex-wrap items-center gap-4">

          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) =>
              setScore(Number(e.target.value))
            }
            className="w-32 rounded-xl border px-4 py-3"
          />

          <button
            onClick={saveRecruiterScore}
            disabled={saving}
            className="bg-[#173E7D] hover:bg-blue-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            {saving ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save size={18} />
            )}

            Save Score

          </button>

        </div>

      </div>

      {/* Transcript */}

      {presentation.transcript && (
        <div className="border rounded-3xl p-6">

          <h3 className="font-black text-xl mb-4">
            Transcript
          </h3>

          <div className="max-h-80 overflow-auto whitespace-pre-wrap leading-7 text-gray-700">
            {presentation.transcript}
          </div>

        </div>
      )}

    </div>
  );
}