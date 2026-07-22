///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  applicationId: string;
  title: string;
  duration: number;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface SubmitQuizRequest {
  applicationId: string;
  answers: Record<string, string>;
}

export interface SubmitQuizResponse {
  success: boolean;
  score: number;
  passed: boolean;
  message?: string;
}

///////////////////////////////////////////////////////////////
// CONFIG
///////////////////////////////////////////////////////////////

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

///////////////////////////////////////////////////////////////
// SERVICE
///////////////////////////////////////////////////////////////

class QuizService {

  /////////////////////////////////////////////////////////////
  // GET QUIZ
  /////////////////////////////////////////////////////////////

  async getQuiz(
    applicationId: string
  ): Promise<Quiz> {

    const response = await fetch(

      `${API_URL}/quiz/${applicationId}`,

      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",
        },
      }

    );

    if (!response.ok) {

      throw new Error("Unable to load quiz.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // SUBMIT QUIZ
  /////////////////////////////////////////////////////////////

  async submitQuiz(
    data: SubmitQuizRequest
  ): Promise<SubmitQuizResponse> {

    const response = await fetch(

      `${API_URL}/quiz/submit`,

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),
      }

    );

    if (!response.ok) {

      throw new Error("Unable to submit quiz.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // GET RESULT
  /////////////////////////////////////////////////////////////

  async getQuizResult(
    applicationId: string
  ): Promise<SubmitQuizResponse> {

    const response = await fetch(

      `${API_URL}/quiz/result/${applicationId}`,

      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",
        },
      }

    );

    if (!response.ok) {

      throw new Error("Unable to load quiz result.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // REGENERATE QUIZ
  /////////////////////////////////////////////////////////////

  async regenerateQuiz(
    applicationId: string
  ): Promise<Quiz> {

    const response = await fetch(

      `${API_URL}/quiz/regenerate/${applicationId}`,

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },
      }

    );

    if (!response.ok) {

      throw new Error("Unable to regenerate quiz.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // DELETE QUIZ
  /////////////////////////////////////////////////////////////

  async deleteQuiz(
    quizId: string
  ): Promise<void> {

    const response = await fetch(

      `${API_URL}/quiz/${quizId}`,

      {
        method: "DELETE",
      }

    );

    if (!response.ok) {

      throw new Error("Unable to delete quiz.");

    }

  }

}

///////////////////////////////////////////////////////////////
// EXPORT
///////////////////////////////////////////////////////////////

const quizService = new QuizService();

export default quizService;