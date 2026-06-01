import { forwardRef } from "react";
import { CVData } from "./types";

interface Props {
  data: CVData;
}

const CVPreview = forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white p-10 shadow rounded-xl min-h-[1000px]"
      >
        <h1 className="text-4xl font-bold">
          {data.fullName}
        </h1>

        <p className="text-gray-600">
          {data.title}
        </p>

        <hr className="my-4" />

        <h2 className="font-bold text-xl mb-2">
          About
        </h2>

        <p>{data.summary}</p>

        <h2 className="font-bold text-xl mt-8 mb-2">
          Skills
        </h2>

        <ul>
          {data.skills.map((skill, i) => (
            <li key={i}>• {skill}</li>
          ))}
        </ul>

        <h2 className="font-bold text-xl mt-8 mb-2">
          Experience
        </h2>

        {data.experiences.map((exp, i) => (
          <div key={i} className="mb-4">
            <h3 className="font-bold">
              {exp.position}
            </h3>

            <p>{exp.company}</p>

            <p>{exp.period}</p>

            <p>{exp.description}</p>
          </div>
        ))}
      </div>
    );
  }
);

export default CVPreview;