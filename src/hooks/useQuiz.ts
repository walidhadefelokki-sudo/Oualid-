import { useEffect, useMemo, useState } from "react";

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
  correctAnswer: string;
  explanation?: string;
}

export interface UseQuizProps {
  questions: QuizQuestion[];
  duration?: number; // seconds
  onCompleted?: (score: number) => void;
}

///////////////////////////////////////////////////////////////
// HOOK
///////////////////////////////////////////////////////////////

export default function useQuiz({
  questions,
  duration = 15 * 60,
  onCompleted,
}: UseQuizProps) {

  /////////////////////////////////////////////////////////////
  // STATE
  /////////////////////////////////////////////////////////////

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [timeRemaining, setTimeRemaining] = useState(duration);

  const [loading, setLoading] = useState(false);

  const [quizFinished, setQuizFinished] = useState(false);

  const [score, setScore] = useState(0);

  /////////////////////////////////////////////////////////////
  // CURRENT QUESTION
  /////////////////////////////////////////////////////////////

  const currentQuestion = useMemo(() => {

    return questions[currentQuestionIndex];

  }, [questions, currentQuestionIndex]);

  /////////////////////////////////////////////////////////////
  // QUIZ PROGRESS
  /////////////////////////////////////////////////////////////

  const progress = useMemo(() => {

    if (questions.length === 0) return 0;

    return Math.round(

      ((currentQuestionIndex + 1) / questions.length) * 100

    );

  }, [currentQuestionIndex, questions]);

  /////////////////////////////////////////////////////////////
  // ANSWER COUNT
  /////////////////////////////////////////////////////////////

  const answeredQuestions = useMemo(() => {

    return Object.keys(answers).length;

  }, [answers]);

  /////////////////////////////////////////////////////////////
  // TIMER
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    if (quizFinished) return;

    if (timeRemaining <= 0) {

      finishQuiz();

      return;

    }

    const interval = setInterval(() => {

      setTimeRemaining(previous => previous - 1);

    }, 1000);

    return () => clearInterval(interval);

  }, [timeRemaining, quizFinished]);

  /////////////////////////////////////////////////////////////
  // FORMAT TIME
  /////////////////////////////////////////////////////////////

  const formatTime = (seconds: number) => {

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;

  };

  /////////////////////////////////////////////////////////////
  // SELECT ANSWER
  /////////////////////////////////////////////////////////////

  const selectAnswer = (

    questionId: string,

    answerId: string

  ) => {

    setAnswers(previous => ({

      ...previous,

      [questionId]: answerId,

    }));

  };

  /////////////////////////////////////////////////////////////
  // NEXT QUESTION
  /////////////////////////////////////////////////////////////

  const nextQuestion = () => {

    if (currentQuestionIndex >= questions.length - 1) return;

    setCurrentQuestionIndex(previous => previous + 1);

  };

  /////////////////////////////////////////////////////////////
  // PREVIOUS QUESTION
  /////////////////////////////////////////////////////////////

  const previousQuestion = () => {

    if (currentQuestionIndex <= 0) return;

    setCurrentQuestionIndex(previous => previous - 1);

  };

  /////////////////////////////////////////////////////////////
  // GO TO QUESTION
  /////////////////////////////////////////////////////////////

  const goToQuestion = (index: number) => {

    if (index < 0) return;

    if (index >= questions.length) return;

    setCurrentQuestionIndex(index);

  };

  /////////////////////////////////////////////////////////////
  // RESET QUIZ
  /////////////////////////////////////////////////////////////

  const resetQuiz = () => {

    setCurrentQuestionIndex(0);

    setAnswers({});

    setTimeRemaining(duration);

    setQuizFinished(false);

    setLoading(false);

    setScore(0);

  };
    /////////////////////////////////////////////////////////////
  // CALCULATE SCORE
  /////////////////////////////////////////////////////////////

  const calculateScore = () => {

    let correctAnswers = 0;

    questions.forEach((question) => {

      if (answers[question.id] === question.correctAnswer) {

        correctAnswers++;

      }

    });

    return Math.round(

      (correctAnswers / questions.length) * 100

    );

  };

  /////////////////////////////////////////////////////////////
  // QUIZ SUMMARY
  /////////////////////////////////////////////////////////////

  const summary = useMemo(() => {

    const correct = questions.filter(

      (question) =>

        answers[question.id] === question.correctAnswer

    ).length;

    const incorrect = answeredQuestions - correct;

    const unanswered = questions.length - answeredQuestions;

    return {

      total: questions.length,

      answered: answeredQuestions,

      unanswered,

      correct,

      incorrect,

    };

  }, [

    answers,

    answeredQuestions,

    questions,

  ]);

  /////////////////////////////////////////////////////////////
  // FINISH QUIZ
  /////////////////////////////////////////////////////////////

  const finishQuiz = async () => {

    if (quizFinished) return;

    try {

      setLoading(true);

      const finalScore = calculateScore();

      setScore(finalScore);

      //////////////////////////////////////////////////////
      // Future Backend
      //////////////////////////////////////////////////////

      /*
      await quizService.submit({

          answers,

          score: finalScore

      })
      */

      //////////////////////////////////////////////////////

      setQuizFinished(true);

      onCompleted?.(finalScore);

    }

    catch (error) {

      console.error(error);

    }

    finally {

      setLoading(false);

    }

  };

  /////////////////////////////////////////////////////////////
  // SUBMIT QUIZ
  /////////////////////////////////////////////////////////////

  const submitQuiz = async () => {

    await finishQuiz();

  };

  /////////////////////////////////////////////////////////////
  // AUTO SUBMIT
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    if (

      !quizFinished &&

      timeRemaining <= 0

    ) {

      submitQuiz();

    }

  }, [

    quizFinished,

    timeRemaining,

  ]);

  /////////////////////////////////////////////////////////////
  // RETURN
  /////////////////////////////////////////////////////////////

  return {

    /////////////////////////////////////////////////////////
    // Data
    /////////////////////////////////////////////////////////

    questions,

    currentQuestion,

    currentQuestionIndex,

    answers,

    score,

    summary,

    /////////////////////////////////////////////////////////
    // State
    /////////////////////////////////////////////////////////

    loading,

    quizFinished,

    timeRemaining,

    progress,

    /////////////////////////////////////////////////////////
    // Actions
    /////////////////////////////////////////////////////////

    selectAnswer,

    nextQuestion,

    previousQuestion,

    goToQuestion,

    resetQuiz,

    finishQuiz,

    submitQuiz,

    /////////////////////////////////////////////////////////
    // Helpers
    /////////////////////////////////////////////////////////

    formatTime,

    calculateScore,

  };

}