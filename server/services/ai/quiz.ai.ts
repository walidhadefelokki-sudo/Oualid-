import { askAI } from "./openai.provider";
import { AppError } from "../../middleware/error.middleware";

export interface GeneratedQuestion {
  question: string;
  skill?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface AnswerEvaluation {
  score: number; // 0-100
  feedback: string;
}

function stripFences(raw: string): string {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * Generate exactly 5 personalised questions based on a candidate's CV text.
 */
export async function generateQuizQuestions(
  cvText: string
): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an expert technical recruiter.

Read this candidate's CV and write EXACTLY 5 interview questions that are
directly based on what is actually written in the CV: technologies used,
real projects, education, professional experience, and responsibilities.

Do NOT write generic interview questions. Each question must reference
something specific found in the CV text below.

CANDIDATE CV:
${cvText}

Return ONLY valid JSON, an array of exactly 5 objects:
[
  {
    "question": "",
    "skill": "",
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }
]
`;

  const raw = await askAI(prompt);

  if (!raw) {
    throw new AppError("Empty AI response while generating quiz.", 500);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (error) {
    console.error("Quiz AI parse error:", error, raw);
    throw new AppError("Invalid AI response while generating quiz.", 500);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new AppError("AI did not return a valid question list.", 500);
  }

  const questions: GeneratedQuestion[] = parsed.slice(0, 5).map((q: any) => ({
    question: String(q.question ?? "").trim(),
    skill: q.skill ? String(q.skill) : undefined,
    difficulty: ["EASY", "MEDIUM", "HARD"].includes(q.difficulty)
      ? q.difficulty
      : "MEDIUM",
  }));

  if (questions.some((q) => !q.question)) {
    throw new AppError("AI returned one or more empty questions.", 500);
  }

  if (questions.length !== 5) {
    throw new AppError("AI did not return exactly 5 questions.", 500);
  }

  return questions;
}

/**
 * Evaluate a single candidate answer against its question.
 */
export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<AnswerEvaluation> {
  const prompt = `
You are an expert technical recruiter grading an interview answer.

QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Score the answer from 0 to 100 based on relevance, accuracy, and depth.
If the answer is empty, off-topic, or says "I don't know", score it low.

Return ONLY valid JSON:
{
  "score": 0,
  "feedback": ""
}
`;

  const raw = await askAI(prompt);

  if (!raw) {
    return { score: 0, feedback: "No AI response received." };
  }

  try {
    const parsed = JSON.parse(stripFences(raw));
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      feedback: String(parsed.feedback ?? ""),
    };
  } catch (error) {
    console.error("Quiz answer AI parse error:", error, raw);
    return { score: 0, feedback: "Unable to evaluate this answer." };
  }
}
