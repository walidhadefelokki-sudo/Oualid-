import api from "./api";

export interface QuizQuestion {
  id: string;
  order: number;
  question: string;
  skill?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface QuizAnswer {
  id: string;
  questionId: string;
  answer: string;
  aiScore?: number | null;
  aiFeedback?: string | null;
  question?: QuizQuestion;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  aiScore?: number | null;
  recruiterScore?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  answers: QuizAnswer[];
}

export interface Quiz {
  id: string;
  status: "PENDING" | "GENERATED" | "IN_PROGRESS" | "SUBMITTED" | "REVIEWED";
  generatedAt: string;
  submittedAt?: string | null;
  questions: QuizQuestion[];
  attempt?: QuizAttempt | null;
}

class QuizService {
  /**
   * Candidate: Get the quiz (generates it from the candidate's CV
   * on first call).
   */
  async getQuiz(): Promise<Quiz> {
    const response = await api.get("/quiz");
    return response.data.data.quiz;
  }

  /**
   * Candidate: Start/resume the quiz.
   */
  async startQuiz(): Promise<Quiz> {
    const response = await api.post("/quiz/start");
    return response.data.data.quiz;
  }

  /**
   * Candidate: Submit all answers.
   */
  async submitQuiz(
    answers: { questionId: string; answer: string }[]
  ): Promise<{ attempt: QuizAttempt; aiScore: number }> {
    const response = await api.post("/quiz/submit", { answers });
    return response.data.data;
  }

  /**
   * Candidate: Get own attempt/result.
   */
  async getMyAttempt(): Promise<QuizAttempt | null> {
    const response = await api.get("/quiz/attempt");
    return response.data.data.attempt;
  }

  /**
   * Candidate: Delete own attempt to retake the quiz.
   */
  async deleteAttempt(): Promise<void> {
    await api.delete("/quiz/attempt");
  }

  /**
   * Recruiter/Admin: View a specific attempt.
   */
  async getAttemptById(attemptId: string): Promise<QuizAttempt> {
    const response = await api.get(`/quiz/attempt/${attemptId}`);
    return response.data.data.attempt;
  }
}

export default new QuizService();
