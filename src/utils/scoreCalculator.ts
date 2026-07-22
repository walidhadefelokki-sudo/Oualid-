///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface QuizQuestion {
  id: string;

  correctAnswer: string;

  difficulty?: "easy" | "medium" | "hard";

  weight?: number;
}

///////////////////////////////////////////////////////////////
// DEFAULT WEIGHTS
///////////////////////////////////////////////////////////////

const DIFFICULTY_WEIGHTS = {
  easy: 1,
  medium: 2,
  hard: 3,
};

///////////////////////////////////////////////////////////////
// BASIC SCORE
///////////////////////////////////////////////////////////////

export function calculateScore(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {

  if (questions.length === 0) {

    return 0;

  }

  let correct = 0;

  for (const question of questions) {

    if (
      answers[question.id] ===
      question.correctAnswer
    ) {

      correct++;

    }

  }

  return Math.round(
    (correct / questions.length) * 100
  );

}

///////////////////////////////////////////////////////////////
// COUNT CORRECT ANSWERS
///////////////////////////////////////////////////////////////

export function countCorrectAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {

  return questions.filter(

    question =>

      answers[question.id] ===
      question.correctAnswer

  ).length;

}

///////////////////////////////////////////////////////////////
// COUNT WRONG ANSWERS
///////////////////////////////////////////////////////////////

export function countWrongAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {

  return questions.filter(

    question => {

      const answer = answers[question.id];

      return (

        answer !== undefined &&

        answer !== question.correctAnswer

      );

    }

  ).length;

}

///////////////////////////////////////////////////////////////
// COUNT UNANSWERED
///////////////////////////////////////////////////////////////

export function countUnansweredQuestions(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {

  return questions.length -

    Object.keys(answers).length;

}

///////////////////////////////////////////////////////////////
// WEIGHTED SCORE
///////////////////////////////////////////////////////////////

export function calculateWeightedScore(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {

  let earnedPoints = 0;

  let totalPoints = 0;

  for (const question of questions) {

    const weight =

      question.weight ??

      DIFFICULTY_WEIGHTS[
        question.difficulty ?? "easy"
      ];

    totalPoints += weight;

    if (

      answers[question.id] ===
      question.correctAnswer

    ) {

      earnedPoints += weight;

    }

  }

  if (totalPoints === 0) {

    return 0;

  }

  return Math.round(

    (earnedPoints / totalPoints) * 100

  );

}

///////////////////////////////////////////////////////////////
// NEGATIVE MARKING
///////////////////////////////////////////////////////////////

export function calculateNegativeScore(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  penalty = 0.25
): number {

  let score = 0;

  for (const question of questions) {

    const answer = answers[question.id];

    if (!answer) continue;

    if (

      answer === question.correctAnswer

    ) {

      score += 1;

    }

    else {

      score -= penalty;

    }

  }

  score = Math.max(score, 0);

  return Math.round(

    (score / questions.length) * 100

  );

}

///////////////////////////////////////////////////////////////
// PASS / FAIL
///////////////////////////////////////////////////////////////

export function hasPassed(
  score: number,
  passingScore = 70
): boolean {

  return score >= passingScore;

}

///////////////////////////////////////////////////////////////
// GRADE
///////////////////////////////////////////////////////////////

export function calculateGrade(
  score: number
): string {

  if (score >= 95) return "A+";

  if (score >= 90) return "A";

  if (score >= 85) return "B+";

  if (score >= 80) return "B";

  if (score >= 75) return "C+";

  if (score >= 70) return "C";

  if (score >= 60) return "D";

  return "F";

}

///////////////////////////////////////////////////////////////
// PERFORMANCE LEVEL
///////////////////////////////////////////////////////////////

export function getPerformanceLevel(
  score: number
): string {

  if (score >= 90)

    return "Excellent";

  if (score >= 80)

    return "Very Good";

  if (score >= 70)

    return "Good";

  if (score >= 60)

    return "Average";

  return "Needs Improvement";

}

///////////////////////////////////////////////////////////////
// DETAILED RESULT
///////////////////////////////////////////////////////////////

export function buildScoreReport(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  passingScore = 70
) {

  const score = calculateScore(
    questions,
    answers
  );

  const weightedScore =
    calculateWeightedScore(
      questions,
      answers
    );

  const correct =
    countCorrectAnswers(
      questions,
      answers
    );

  const wrong =
    countWrongAnswers(
      questions,
      answers
    );

  const unanswered =
    countUnansweredQuestions(
      questions,
      answers
    );

  return {

    score,

    weightedScore,

    correct,

    wrong,

    unanswered,

    passed: hasPassed(
      score,
      passingScore
    ),

    grade: calculateGrade(score),

    performance:
      getPerformanceLevel(score),

  };

}