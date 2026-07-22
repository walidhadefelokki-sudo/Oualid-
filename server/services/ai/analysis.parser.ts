import { AppError } from "../../middleware/error.middleware";

interface AIAnalysisResult {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  languageScore: number;

  extractedSkills: string[];
  extractedLanguages: string[];

  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function parseAnalysis(
  response: string
): AIAnalysisResult {

  if (!response) {
    throw new AppError(
      "Empty AI response.",
      500
    );
  }

  try {

    // Remove markdown code fences
    const cleaned = response
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {

      overallScore:
        Number(parsed.overallScore ?? 0),

      skillsScore:
        Number(parsed.skillsScore ?? 0),

      experienceScore:
        Number(parsed.experienceScore ?? 0),

      educationScore:
        Number(parsed.educationScore ?? 0),

      languageScore:
        Number(parsed.languageScore ?? 0),

      extractedSkills:
        Array.isArray(parsed.extractedSkills)
          ? parsed.extractedSkills
          : [],

      extractedLanguages:
        Array.isArray(parsed.extractedLanguages)
          ? parsed.extractedLanguages
          : [],

      strengths:
        Array.isArray(parsed.strengths)
          ? parsed.strengths
          : [],

      weaknesses:
        Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses
          : [],

      recommendations:
        Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],

    };

  } catch (error) {

    console.error(
      "AI Parser Error:",
      error
    );

    throw new AppError(
      "Invalid AI response format.",
      500
    );

  }

}