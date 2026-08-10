import { useEffect, useState } from "react";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Trophy,
} from "lucide-react";

import quizService, { Quiz, QuizAttempt } from "../../services/quiz.service";

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function AIQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  async function loadQuiz() {
    try {
      setLoading(true);
      setError(null);

      const data = await quizService.getQuiz();
      setQuiz(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load your quiz. Please make sure you have uploaded a CV."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!quiz) return;

    try {
      setSubmitting(true);

      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || "",
      }));

      await quizService.submitQuiz(payload);
      await loadQuiz();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Unable to submit your quiz."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetake() {
    try {
      setRetaking(true);
      await quizService.deleteAttempt();
      setAnswers({});
      setCurrentIndex(0);
      await loadQuiz();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to reset your quiz.");
    } finally {
      setRetaking(false);
    }
  }

  ///////////////////////////////////////////////////////////
  // LOADING
  ///////////////////////////////////////////////////////////

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-12 text-center">
        <Loader2
          className="animate-spin mx-auto text-[#173E7D]"
          size={48}
        />
        <h2 className="text-xl font-bold text-[#173E7D] mt-6">
          Preparing your quiz
        </h2>
        <p className="text-gray-500 mt-2">
          We're generating 5 personalised questions from your CV.
        </p>
      </div>
    );
  }

  ///////////////////////////////////////////////////////////
  // ERROR / EMPTY
  ///////////////////////////////////////////////////////////

  if (error || !quiz) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Quiz</h1>
          <p className="text-gray-500 mt-2">
            Personalized interview questions generated from your CV.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-red-600">
            Unable to load quiz
          </h2>
          <p className="mt-3 text-gray-600">{error}</p>
          <button
            onClick={loadQuiz}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#173E7D] text-white font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const attempt: QuizAttempt | null | undefined = quiz.attempt;
  const isSubmitted = !!attempt?.submittedAt;

  ///////////////////////////////////////////////////////////
  // RESULT VIEW
  ///////////////////////////////////////////////////////////

  if (isSubmitted && attempt) {
    const score = Math.round(attempt.aiScore ?? 0);
    const passed = score >= 60;

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 text-center">
          <div
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
              passed ? "bg-green-100" : "bg-orange-100"
            }`}
          >
            <Trophy
              size={44}
              className={passed ? "text-green-600" : "text-orange-500"}
            />
          </div>

          <h1 className="text-3xl font-black text-[#173E7D] mt-6">
            Quiz Completed
          </h1>
          <p className="text-gray-500 mt-2">
            Your answers have been evaluated by AI.
          </p>

          <div className="w-40 h-40 mx-auto mt-8 rounded-full border-[10px] border-[#173E7D] flex items-center justify-center">
            <div>
              <p className="text-4xl font-black text-[#173E7D]">{score}</p>
              <p className="text-gray-500 text-sm">/ 100</p>
            </div>
          </div>

          <button
            onClick={handleRetake}
            disabled={retaking}
            className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 font-semibold hover:border-[#173E7D]"
          >
            {retaking ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RotateCcw size={18} />
            )}
            Retake Quiz
          </button>
        </div>

        <div className="space-y-4">
          {attempt.answers.map((a, i) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <p className="text-sm text-gray-400 font-semibold">
                Question {i + 1}
              </p>
              <h3 className="font-bold text-[#173E7D] mt-1">
                {a.question?.question}
              </h3>

              <p className="text-gray-600 mt-3 whitespace-pre-wrap">
                {a.answer || (
                  <span className="italic text-gray-400">No answer</span>
                )}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#173E7D]">
                  Score: {Math.round(a.aiScore ?? 0)}/100
                </span>
              </div>

              {a.aiFeedback && (
                <p className="text-sm text-gray-500 mt-2 border-t pt-3">
                  {a.aiFeedback}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  ///////////////////////////////////////////////////////////
  // QUESTION VIEW
  ///////////////////////////////////////////////////////////

  const questions = quiz.questions;
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a.trim()).length;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#173E7D] flex items-center justify-center">
            <Brain className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#173E7D]">
              AI Candidate Quiz
            </h1>
            <p className="text-gray-500 mt-1">
              5 questions generated from your CV. Answer in your own words.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-[#173E7D]">
            Question {currentIndex + 1}/{questions.length}
          </h2>
          <span className="text-sm text-gray-500">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 mt-5 overflow-hidden">
          <div
            className="h-full bg-[#173E7D] transition-all duration-500"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
        {currentQuestion.skill && (
          <span className="inline-block text-xs font-semibold text-[#173E7D] bg-blue-50 px-3 py-1 rounded-full">
            {currentQuestion.skill}
          </span>
        )}

        <h2 className="text-2xl font-bold text-[#173E7D] mt-4">
          {currentQuestion.question}
        </h2>

        <textarea
          value={answers[currentQuestion.id] || ""}
          onChange={(e) =>
            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: e.target.value,
            }))
          }
          rows={6}
          placeholder="Type your answer here..."
          className="mt-6 w-full rounded-2xl border-2 border-gray-200 p-5 text-lg focus:border-[#173E7D] focus:outline-none resize-none"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-3 px-6 py-3 rounded-xl border border-gray-300 disabled:opacity-40"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          {!isLast ? (
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              className="flex items-center gap-3 px-8 py-3 rounded-xl bg-[#173E7D] text-white font-bold"
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-3 px-8 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <CheckCircle2 size={20} />
              )}
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
