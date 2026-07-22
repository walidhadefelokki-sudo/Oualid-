import React from "react";
import { CheckCircle2 } from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestionData {
  id: string;
  question: string;
  options: QuizOption[];
}

interface QuizQuestionProps {
  question: QuizQuestionData;

  selectedAnswer?: string;

  onSelectAnswer: (
    questionId: string,
    answerId: string
  ) => void;

  disabled?: boolean;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizQuestion({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
}: QuizQuestionProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">

      {/* Header */}

      <div className="flex items-center gap-3 mb-8">

        <div className="w-12 h-12 rounded-full bg-[#173E7D] text-white flex items-center justify-center font-bold text-lg">
          ?
        </div>

        <div>

          <h2 className="text-2xl font-bold text-[#173E7D]">

            {question.question}

          </h2>

          <p className="text-gray-500 mt-1">

            Select one answer.

          </p>

        </div>

      </div>

      {/* Options */}

      <div className="space-y-5">

        {question.options.map((option) => {

          const isSelected =
            selectedAnswer === option.id;

          return (

            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                onSelectAnswer(
                  question.id,
                  option.id
                )
              }
              className={`
                w-full
                text-left
                rounded-2xl
                border-2
                p-5
                transition-all
                duration-200
                disabled:cursor-not-allowed
                disabled:opacity-60
                ${
                  isSelected
                    ? "border-[#173E7D] bg-blue-50"
                    : "border-gray-200 hover:border-[#173E7D] hover:bg-gray-50"
                }
              `}
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-5">

                  {/* Option Letter */}

                  <div
                    className={`
                      w-12
                      h-12
                      rounded-full
                      flex
                      items-center
                      justify-center
                      font-bold
                      text-lg
                      ${
                        isSelected
                          ? "bg-[#173E7D] text-white"
                          : "bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    {option.id.toUpperCase()}
                  </div>

                  {/* Text */}

                  <span className="text-lg text-gray-800">

                    {option.text}

                  </span>

                </div>

                {/* Selected */}

                {isSelected && (

                  <CheckCircle2
                    size={28}
                    className="text-[#173E7D]"
                  />

                )}

              </div>

            </button>

          );

        })}

      </div>

    </div>
  );
}