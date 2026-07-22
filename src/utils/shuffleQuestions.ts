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
// GENERIC ARRAY SHUFFLE (FISHER-YATES)
///////////////////////////////////////////////////////////////

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

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
// SHUFFLE OPTIONS
///////////////////////////////////////////////////////////////

export function shuffleOptions(
  question: QuizQuestion
): QuizQuestion {
  const shuffledOptions = shuffleArray(
    question.options
  );

  return {
    ...question,
    options: shuffledOptions,
  };
}

///////////////////////////////////////////////////////////////
// SHUFFLE QUESTIONS
///////////////////////////////////////////////////////////////

export function shuffleQuestions(
  questions: QuizQuestion[]
): QuizQuestion[] {
  return shuffleArray(questions);
}

///////////////////////////////////////////////////////////////
// SHUFFLE QUESTIONS + OPTIONS
///////////////////////////////////////////////////////////////

export function shuffleQuiz(
  questions: QuizQuestion[]
): QuizQuestion[] {
  return shuffleArray(
    questions.map(shuffleOptions)
  );
}

///////////////////////////////////////////////////////////////
// SHUFFLE ONLY IF ENABLED
///////////////////////////////////////////////////////////////

export function maybeShuffleQuiz(
  questions: QuizQuestion[],
  enabled = true
): QuizQuestion[] {
  if (!enabled) {
    return questions;
  }

  return shuffleQuiz(questions);
}

///////////////////////////////////////////////////////////////
// RANDOM QUESTION
///////////////////////////////////////////////////////////////

export function getRandomQuestion(
  questions: QuizQuestion[]
): QuizQuestion | null {
  if (questions.length === 0) {
    return null;
  }

  const index = Math.floor(
    Math.random() * questions.length
  );

  return questions[index];
}

///////////////////////////////////////////////////////////////
// RANDOM QUESTIONS
///////////////////////////////////////////////////////////////

export function getRandomQuestions(
  questions: QuizQuestion[],
  count: number
): QuizQuestion[] {
  return shuffleQuestions(questions).slice(
    0,
    count
  );
}

///////////////////////////////////////////////////////////////
// RANDOM OPTIONS
///////////////////////////////////////////////////////////////

export function getRandomOptions(
  options: QuizOption[],
  count: number
): QuizOption[] {
  return shuffleArray(options).slice(
    0,
    count
  );
}

///////////////////////////////////////////////////////////////
// REMOVE DUPLICATE QUESTIONS
///////////////////////////////////////////////////////////////

export function removeDuplicateQuestions(
  questions: QuizQuestion[]
): QuizQuestion[] {
  const seen = new Set<string>();

  return questions.filter((question) => {
    if (seen.has(question.id)) {
      return false;
    }

    seen.add(question.id);

    return true;
  });
}

///////////////////////////////////////////////////////////////
// REMOVE DUPLICATE OPTIONS
///////////////////////////////////////////////////////////////

export function removeDuplicateOptions(
  options: QuizOption[]
): QuizOption[] {
  const seen = new Set<string>();

  return options.filter((option) => {
    if (seen.has(option.id)) {
      return false;
    }

    seen.add(option.id);

    return true;
  });
}

///////////////////////////////////////////////////////////////
// PREPARE QUIZ
///////////////////////////////////////////////////////////////

export function prepareQuiz(
  questions: QuizQuestion[],
  {
    shuffleQuestionsEnabled = true,
    shuffleOptionsEnabled = true,
    removeDuplicates = true,
  }: {
    shuffleQuestionsEnabled?: boolean;
    shuffleOptionsEnabled?: boolean;
    removeDuplicates?: boolean;
  } = {}
): QuizQuestion[] {
  let prepared = [...questions];

  if (removeDuplicates) {
    prepared = removeDuplicateQuestions(
      prepared
    );
  }

  if (shuffleOptionsEnabled) {
    prepared = prepared.map((question) => ({
      ...question,
      options: removeDuplicates
        ? removeDuplicateOptions(
            shuffleArray(question.options)
          )
        : shuffleArray(question.options),
    }));
  }

  if (shuffleQuestionsEnabled) {
    prepared = shuffleArray(prepared);
  }

  return prepared;
}

///////////////////////////////////////////////////////////////
// RANDOM SEED PLACEHOLDER
///////////////////////////////////////////////////////////////

export function shuffleWithSeed(
  questions: QuizQuestion[],
  _seed: string
): QuizQuestion[] {
  // Future implementation:
  // deterministic shuffling using a seed.
  // Useful for exam replay and auditing.

  return shuffleQuiz(questions);
}