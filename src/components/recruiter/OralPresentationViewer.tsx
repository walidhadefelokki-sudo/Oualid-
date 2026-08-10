import React, { useEffect, useState } from "react";
import {
  Video,
  Loader2,
  Star,
  Calendar,
  User,
  Save,
} from "lucide-react";

import oralPresentationService from "../../services/oralPresentation.service";

interface Props {
  candidateId: string;
}

interface OralPresentation {
  id: string;

  video?: {
    id: string;
    url: string;
  };

  recruiterScore?: number;

  createdAt: string;

  candidate?: {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
}

export default function OralPresentationViewer({
  candidateId,
}: Props) {
  const [presentation, setPresentation] =
    useState<OralPresentation | null>(null);

  const [loading, setLoading] = useState(true);

  const [score, setScore] = useState<number>(0);

  const [saving, setSaving] = useState(false);

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

      if (data?.recruiterScore != null) {
        setScore(data.recruiterScore);
      }
    } catch (err) {
      console.error(err);
      setPresentation(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveScore() {
    if (!presentation) return;

    try {
      setSaving(true);

      await oralPresentationService.updateRecruiterScore(
        candidateId,
        score
      );

      alert("Score saved.");
    } catch (err) {
      console.error(err);
      alert("Unable to save score.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2
          className="animate-spin text-[#173E7D]"
          size={32}
        />
      </div>
    );
  }

  if (!presentation?.video?.url) {
    return (
      <div className="bg-white rounded-3xl border p-8 text-center">
        <Video
          size={50}
          className="mx-auto text-gray-400 mb-4"
        />

        <h2 className="text-xl font-bold">
          No Oral Presentation
        </h2>

        <p className="text-gray-500 mt-2">
          This candidate has not uploaded an oral presentation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-8">

      <div className="flex items-center gap-3 mb-6">

        <Video
          size={26}
          className="text-[#173E7D]"
        />

        <div>
          <h2 className="text-xl font-bold text-[#173E7D]">
            Oral Presentation
          </h2>

          <p className="text-gray-500">
            Candidate introduction
          </p>
        </div>

      </div>

      <video
        controls
        className="w-full rounded-2xl border"
        src={presentation.video.url}
      />

      <div className="mt-6 flex flex-wrap gap-6 text-gray-600">

        <div className="flex items-center gap-2">
          <Calendar size={18} />
          {new Date(
            presentation.createdAt
          ).toLocaleDateString()}
        </div>

        <div className="flex items-center gap-2">
          <User size={18} />
          {presentation.candidate?.fullName ??
            `${presentation.candidate?.firstName ?? ""} ${
              presentation.candidate?.lastName ?? ""
            }`}
        </div>

      </div>

      <div className="mt-8">

        <label className="font-semibold flex items-center gap-2 mb-3">
          <Star size={18} />
          Recruiter Score
        </label>

        <input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) =>
            setScore(Number(e.target.value))
          }
          className="border rounded-xl p-3 w-40"
        />

        <button
          onClick={saveScore}
          disabled={saving}
          className="ml-4 px-5 py-3 bg-[#173E7D] text-white rounded-xl font-semibold hover:bg-blue-900 flex items-center gap-2 inline-flex"
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
  );
}