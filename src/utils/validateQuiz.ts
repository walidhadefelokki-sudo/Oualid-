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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

///////////////////////////////////////////////////////////////
// EMPTY QUIZ
///////////////////////////////////////////////////////////////

export function validateQuiz(
  questions: QuizQuestion[]
): ValidationResult {

  const errors: string[] = [];

  if (!questions.length) {

    errors.push("Quiz contains no questions.");

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// QUESTION
///////////////////////////////////////////////////////////////

export function validateQuestion(
  question: QuizQuestion
): ValidationResult {

  const errors: string[] = [];

  if (!question.id.trim()) {

    errors.push("Question ID is required.");

  }

  if (!question.question.trim()) {

    errors.push("Question text is required.");

  }

  if (question.options.length < 2) {

    errors.push(
      "Question must contain at least two options."
    );

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// OPTIONS
///////////////////////////////////////////////////////////////

export function validateOptions(
  question: QuizQuestion
): ValidationResult {

  const errors: string[] = [];

  const ids = new Set<string>();

  for (const option of question.options) {

    if (!option.id.trim()) {

      errors.push("Option ID is required.");

    }

    if (!option.text.trim()) {

      errors.push("Option text is required.");

    }

    if (ids.has(option.id)) {

      errors.push(

        `Duplicate option ID "${option.id}".`

      );

    }

    ids.add(option.id);

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// CORRECT ANSWER
///////////////////////////////////////////////////////////////

export function validateCorrectAnswer(
  question: QuizQuestion
): ValidationResult {

  const errors: string[] = [];

  if (!question.correctAnswer) {

    errors.push(

      "Correct answer is missing."

    );

  }

  else {

    const exists = question.options.some(

      option =>

        option.id === question.correctAnswer

    );

    if (!exists) {

      errors.push(

        "Correct answer does not exist in options."

      );

    }

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// DUPLICATE QUESTIONS
///////////////////////////////////////////////////////////////

export function validateDuplicateQuestions(
  questions: QuizQuestion[]
): ValidationResult {

  const errors: string[] = [];

  const ids = new Set<string>();

  for (const question of questions) {

    if (ids.has(question.id)) {

      errors.push(

        `Duplicate question "${question.id}".`

      );

    }

    ids.add(question.id);

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// ANSWERS
///////////////////////////////////////////////////////////////

export function validateAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>
): ValidationResult {

  const errors: string[] = [];

  for (const question of questions) {

    const answer = answers[question.id];

    if (!answer) continue;

    const exists = question.options.some(

      option => option.id === answer

    );

    if (!exists) {

      errors.push(

        `Invalid answer for question "${question.id}".`

      );

    }

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// SUBMISSION
///////////////////////////////////////////////////////////////

export function validateSubmission(
  questions: QuizQuestion[],
  answers: Record<string, string>
): ValidationResult {

  const errors: string[] = [];

  if (!questions.length) {

    errors.push("Quiz is empty.");

  }

  if (!Object.keys(answers).length) {

    errors.push(

      "No answers have been provided."

    );

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// READY TO SUBMIT
///////////////////////////////////////////////////////////////

export function canSubmitQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): boolean {

  return validateSubmission(

    questions,

    answers

  ).valid;

}

///////////////////////////////////////////////////////////////
// TIMER
///////////////////////////////////////////////////////////////

export function validateRemainingTime(
  remainingTime: number
): ValidationResult {

  const errors: string[] = [];

  if (remainingTime < 0) {

    errors.push(

      "Remaining time cannot be negative."

    );

  }

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// COMPLETE VALIDATION
///////////////////////////////////////////////////////////////

export function validateEntireQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): ValidationResult {

  const errors: string[] = [];

  errors.push(

    ...validateQuiz(questions).errors

  );

  errors.push(

    ...validateDuplicateQuestions(

      questions

    ).errors

  );

  for (const question of questions) {

    errors.push(

      ...validateQuestion(

        question

      ).errors

    );

    errors.push(

      ...validateOptions(

        question

      ).errors

    );

    errors.push(

      ...validateCorrectAnswer(

        question

      ).errors

    );

  }

  errors.push(

    ...validateAnswers(

      questions,

      answers

    ).errors

  );

  return {

    valid: errors.length === 0,

    errors,

  };

}

///////////////////////////////////////////////////////////////
// GET VALIDATION MESSAGE
///////////////////////////////////////////////////////////////

export function getValidationMessage(
  result: ValidationResult
): string {

  if (result.valid) {

    return "Quiz is valid.";

  }

  return result.errors.join("\n");

}