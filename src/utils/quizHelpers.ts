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
  correctAnswer?: string;
}

///////////////////////////////////////////////////////////////
// FORMAT TIME
///////////////////////////////////////////////////////////////

export function formatQuizTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = seconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

///////////////////////////////////////////////////////////////
// CALCULATE SCORE
///////////////////////////////////////////////////////////////

export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {
  if (questions.length === 0) return 0;

  let correct = 0;

  questions.forEach((question) => {
    if (
      question.correctAnswer &&
      answers[question.id] === question.correctAnswer
    ) {
      correct++;
    }
  });

  return Math.round((correct / questions.length) * 100);
}

///////////////////////////////////////////////////////////////
// COUNT CORRECT ANSWERS
///////////////////////////////////////////////////////////////

export function countCorrectAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>
): number {
  let total = 0;

  questions.forEach((question) => {
    if (
      question.correctAnswer &&
      answers[question.id] === question.correctAnswer
    ) {
      total++;
    }
  });

  return total;
}

///////////////////////////////////////////////////////////////
// COUNT ANSWERED QUESTIONS
///////////////////////////////////////////////////////////////

export function countAnsweredQuestions(
  answers: Record<string, string>
): number {
  return Object.keys(answers).length;
}

///////////////////////////////////////////////////////////////
// COUNT UNANSWERED QUESTIONS
///////////////////////////////////////////////////////////////

export function countUnansweredQuestions(
  totalQuestions: number,
  answers: Record<string, string>
): number {
  return totalQuestions - Object.keys(answers).length;
}

///////////////////////////////////////////////////////////////
// QUIZ PROGRESS
///////////////////////////////////////////////////////////////

export function calculateProgress(
  currentQuestion: number,
  totalQuestions: number
): number {
  if (totalQuestions === 0) return 0;

  return Math.round(
    ((currentQuestion + 1) / totalQuestions) * 100
  );
}

///////////////////////////////////////////////////////////////
// PASS / FAIL
///////////////////////////////////////////////////////////////

export function hasPassedQuiz(
  score: number,
  passingScore = 70
): boolean {
  return score >= passingScore;
}

///////////////////////////////////////////////////////////////
// FIND QUESTION
///////////////////////////////////////////////////////////////

export function findQuestionById(
  questions: QuizQuestion[],
  id: string
): QuizQuestion | undefined {
  return questions.find(
    (question) => question.id === id
  );
}

///////////////////////////////////////////////////////////////
// GET ANSWER
///////////////////////////////////////////////////////////////

export function getSelectedAnswer(
  answers: Record<string, string>,
  questionId: string
): string | undefined {
  return answers[questionId];
}

///////////////////////////////////////////////////////////////
// IS QUESTION ANSWERED
///////////////////////////////////////////////////////////////

export function isQuestionAnswered(
  answers: Record<string, string>,
  questionId: string
): boolean {
  return questionId in answers;
}

///////////////////////////////////////////////////////////////
// QUIZ SUMMARY
///////////////////////////////////////////////////////////////

export function getQuizSummary(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  passingScore = 70
) {
  const score = calculateQuizScore(
    questions,
    answers
  );

  const correctAnswers = countCorrectAnswers(
    questions,
    answers
  );

  const answeredQuestions =
    countAnsweredQuestions(answers);

  const unansweredQuestions =
    countUnansweredQuestions(
      questions.length,
      answers
    );

  return {
    score,

    passed: hasPassedQuiz(
      score,
      passingScore
    ),

    totalQuestions: questions.length,

    correctAnswers,

    incorrectAnswers:
      questions.length - correctAnswers,

    answeredQuestions,

    unansweredQuestions,
  };
}

///////////////////////////////////////////////////////////////
// RANDOMIZE QUESTIONS
///////////////////////////////////////////////////////////////

export function shuffleQuestions<T>(
  questions: T[]
): T[] {
  const shuffled = [...questions];

  for (
    let i = shuffled.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}

///////////////////////////////////////////////////////////////
// RANDOMIZE OPTIONS
///////////////////////////////////////////////////////////////

export function shuffleOptions(
  question: QuizQuestion
): QuizQuestion {
  return {
    ...question,

    options: shuffleQuestions(question.options),
  };
}

///////////////////////////////////////////////////////////////
// RANDOMIZE ENTIRE QUIZ
///////////////////////////////////////////////////////////////

export function shuffleQuiz(
  questions: QuizQuestion[]
): QuizQuestion[] {
  return shuffleQuestions(
    questions.map(shuffleOptions)
  );
}

///////////////////////////////////////////////////////////////
// RESET ANSWERS
///////////////////////////////////////////////////////////////

export function createEmptyAnswers(): Record<
  string,
  string
> {
  return {};
}

///////////////////////////////////////////////////////////////
// CREATE TIMER
///////////////////////////////////////////////////////////////

export function createQuizTimer(
  minutes: number
): number {
  return minutes * 60;
}

///////////////////////////////////////////////////////////////
// PERCENTAGE
///////////////////////////////////////////////////////////////

export function percentage(
  value: number,
  total: number
): number {
  if (total === 0) return 0;

  return Math.round(
    (value / total) * 100
  );
}