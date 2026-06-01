import { useRef, useState } from "react";

import CVPreview from "./CVPreview";
import { generatePDF } from "./pdfGenerator";
import { CVData } from "./types";

export default function CVBuilder() {
  const cvRef = useRef<HTMLDivElement>(null);

  const [cvData, setCvData] = useState<CVData>({
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: "",

    skills: [],

    experiences: [],

    education: []
  });

  const downloadPDF = async () => {
  if (!cvRef.current) {
    alert("CV preview not found");
    return;
  }

  await generatePDF(
    cvRef.current,
    cvData.fullName || "CV"
  );
};

  return (
    <div className="grid lg:grid-cols-2 gap-8">

      <div className="space-y-4">

        <input
          className="w-full border p-3 rounded"
          placeholder="Full Name"
          value={cvData.fullName}
          onChange={(e) =>
            setCvData({
              ...cvData,
              fullName: e.target.value
            })
          }
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="Job Title"
          value={cvData.title}
          onChange={(e) =>
            setCvData({
              ...cvData,
              title: e.target.value
            })
          }
        />

        <textarea
          className="w-full border p-3 rounded"
          placeholder="Summary"
          value={cvData.summary}
          onChange={(e) =>
            setCvData({
              ...cvData,
              summary: e.target.value
            })
          }
        />

        <button
          onClick={downloadPDF}
          className="bg-[#173E7D] text-white px-6 py-3 rounded"
        >
          Download PDF
        </button>
      </div>

      <CVPreview
        ref={cvRef}
        data={cvData}
      />

    </div>
  );
}