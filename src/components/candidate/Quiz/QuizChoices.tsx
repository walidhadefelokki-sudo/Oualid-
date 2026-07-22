import React from "react";
import {
  CheckCircle2,
  Circle,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface QuizChoice {
  id: string;
  text: string;
}

interface QuizChoicesProps {
  questionId: string;

  choices: QuizChoice[];

  selectedChoice?: string;

  disabled?: boolean;

  onSelect: (
    questionId: string,
    choiceId: string
  ) => void;
}

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function QuizChoices({
  questionId,
  choices,
  selectedChoice,
  disabled = false,
  onSelect,
}: QuizChoicesProps) {
  return (
    <div className="space-y-4">

      {choices.map((choice, index) => {
        const isSelected =
          selectedChoice === choice.id;

        return (
          <button
            key={choice.id}
            type="button"
            disabled={disabled}
            onClick={() =>
              onSelect(questionId, choice.id)
            }
            className={`
              w-full
              rounded-2xl
              border-2
              p-5
              transition-all
              duration-200
              text-left
              disabled:cursor-not-allowed
              disabled:opacity-60

              ${
                isSelected
                  ? "border-[#173E7D] bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-[#173E7D] hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-5">

                {/* Letter */}

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
                  {String.fromCharCode(65 + index)}
                </div>

                {/* Choice */}

                <div>

                  <p className="text-lg font-medium text-gray-800">

                    {choice.text}

                  </p>

                </div>

              </div>

              {/* Selection */}

              {isSelected ? (
                <CheckCircle2
                  size={28}
                  className="text-[#173E7D]"
                />
              ) : (
                <Circle
                  size={24}
                  className="text-gray-300"
                />
              )}

            </div>
          </button>
        );
      })}

    </div>
  );
}