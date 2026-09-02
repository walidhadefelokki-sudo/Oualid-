import { Info, Clock, Camera, Mic, Languages } from "lucide-react";

export default function RecordingInstructions() {
  return (
    <div className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#173E7D] flex items-center justify-center">
          <Info className="text-white" size={20} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#173E7D]">
            Instructions — Présentation orale
          </h2>

          <p className="text-sm text-gray-600">
            Lisez ces consignes avant de commencer l'enregistrement.
          </p>
        </div>
      </div>

      {/* The language requirement leads the list on purpose: recording in the
          wrong language means re-recording the whole presentation, so it must
          be seen before the candidate presses record. */}
      <div className="flex gap-4 items-start rounded-xl border border-[#F68D58]/30 bg-[#F68D58]/10 p-4 mb-5">
        <Languages className="text-[#F68D58] mt-0.5 shrink-0" size={22} />

        <div>
          <h3 className="font-bold text-[#173E7D]">
            Présentation vidéo en arabe
          </h3>

          <p className="text-gray-700 text-sm mt-0.5">
            Votre présentation doit être enregistrée <span className="font-semibold">en arabe</span>.
          </p>

          <p className="text-gray-700 text-sm mt-1" dir="rtl" lang="ar">
            يجب تسجيل عرضك التقديمي باللغة العربية.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-4">

        <div className="flex gap-4">
          <Clock className="text-[#173E7D] mt-1" size={22} />

          <div>
            <h3 className="font-semibold text-gray-800">
              Recording Duration
            </h3>

            <p className="text-gray-600 text-sm">
              Keep your presentation between
              <span className="font-semibold"> 1 and 2 minutes</span>.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Camera className="text-[#173E7D] mt-1" size={22} />

          <div>
            <h3 className="font-semibold text-gray-800">
              Look at the Camera
            </h3>

            <p className="text-gray-600 text-sm">
              Keep your face visible and maintain eye contact with the camera.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Mic className="text-[#173E7D] mt-1" size={22} />

          <div>
            <h3 className="font-semibold text-gray-800">
              Speak Clearly
            </h3>

            <p className="text-gray-600 text-sm">
              Use a quiet environment and speak confidently.
            </p>
          </div>
        </div>

      </div>

      {/* Tips */}
      <div className="mt-6 rounded-xl bg-white border border-gray-200 p-5">

        <h3 className="font-bold text-[#173E7D] mb-3">
          Recommended Structure
        </h3>

        <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">

          <li>Introduce yourself.</li>

          <li>Mention your education.</li>

          <li>Explain your professional experience.</li>

          <li>Talk about your strongest skills.</li>

          <li>Explain why you are interested in this position.</li>

          <li>Finish with a short thank-you message.</li>

        </ul>

      </div>

      {/* Warning */}
      <div className="mt-6 rounded-xl bg-yellow-50 border border-yellow-300 p-4">

        <p className="text-sm text-yellow-800">

          <strong>Important:</strong> Your oral presentation helps recruiters
          better understand your personality and communication skills.
          It complements your CV but does not replace it.

        </p>

      </div>

    </div>
  );
}