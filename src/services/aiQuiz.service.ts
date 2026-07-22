///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface AIQuizQuestion {
  id: string;

  question: string;

  options: {
    id: string;
    text: string;
  }[];

  correctAnswer?: string;

  explanation?: string;

  difficulty: "easy" | "medium" | "hard";

  category: string;
}

export interface GenerateQuizRequest {

  applicationId: string;

  candidateId: string;

  cvUrl: string;

  numberOfQuestions?: number;

}

export interface GenerateQuizResponse {

  success: boolean;

  quizId: string;

  questions: AIQuizQuestion[];

}

export interface SkillAnalysis {

  skills: string[];

  experienceLevel: string;

  technologies: string[];

  strengths: string[];

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

class AIQuizService {

  /////////////////////////////////////////////////////////////
  // GENERATE QUIZ
  /////////////////////////////////////////////////////////////

  async generateQuiz(
    data: GenerateQuizRequest
  ): Promise<GenerateQuizResponse> {

    const response = await fetch(

      `${API_URL}/ai/quiz/generate`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify(data),

      }

    );

    if (!response.ok) {

      throw new Error("Failed to generate AI quiz.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // ANALYZE CV
  /////////////////////////////////////////////////////////////

  async analyzeCV(
    cvUrl: string
  ): Promise<SkillAnalysis> {

    const response = await fetch(

      `${API_URL}/ai/cv/analyze`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          cvUrl,

        }),

      }

    );

    if (!response.ok) {

      throw new Error("Failed to analyze CV.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // REGENERATE QUIZ
  /////////////////////////////////////////////////////////////

  async regenerateQuiz(
    quizId: string
  ): Promise<GenerateQuizResponse> {

    const response = await fetch(

      `${API_URL}/ai/quiz/${quizId}/regenerate`,

      {

        method: "POST",

      }

    );

    if (!response.ok) {

      throw new Error("Failed to regenerate quiz.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // EXPLAIN ANSWER
  /////////////////////////////////////////////////////////////

  async explainAnswer(

    questionId: string,

    answerId: string

  ): Promise<{

    explanation: string;

  }> {

    const response = await fetch(

      `${API_URL}/ai/question/explain`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          questionId,

          answerId,

        }),

      }

    );

    if (!response.ok) {

      throw new Error("Failed to generate explanation.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // GENERATE FOLLOW-UP QUESTIONS
  /////////////////////////////////////////////////////////////

  async generateFollowUpQuestions(

    applicationId: string

  ): Promise<AIQuizQuestion[]> {

    const response = await fetch(

      `${API_URL}/ai/quiz/follow-up`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          applicationId,

        }),

      }

    );

    if (!response.ok) {

      throw new Error("Failed to generate follow-up questions.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // GENERATE INTERVIEW QUESTIONS
  /////////////////////////////////////////////////////////////

  async generateInterviewQuestions(

    applicationId: string

  ): Promise<AIQuizQuestion[]> {

    const response = await fetch(

      `${API_URL}/ai/interview/questions`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          applicationId,

        }),

      }

    );

    if (!response.ok) {

      throw new Error("Failed to generate interview questions.");

    }

    return response.json();

  }

}

///////////////////////////////////////////////////////////////
// EXPORT
///////////////////////////////////////////////////////////////

const aiQuizService = new AIQuizService();

export default aiQuizService;