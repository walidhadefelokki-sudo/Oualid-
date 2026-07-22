import { useEffect, useMemo, useState } from "react";

import {
    Clock,
    Brain,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Trophy,
} from "lucide-react";

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

interface QuizOption {
    id: string;
    text: string;
}

interface QuizQuestion {
    id: string;

    question: string;

    options: QuizOption[];

    correctAnswer: string;

    explanation?: string;
}

///////////////////////////////////////////////////////////////
// PROPS
///////////////////////////////////////////////////////////////

interface CandidateQuizProps {

    applicationId: string;

    onCompleted?: (score: number) => void;

}

///////////////////////////////////////////////////////////////
// DEMO QUESTIONS
// Phase 6
// Gemini will generate these from the CV
///////////////////////////////////////////////////////////////

const DEMO_QUESTIONS: QuizQuestion[] = [

    {

        id: "1",

        question: "What is React?",

        options: [

            {
                id: "a",
                text: "A JavaScript Library"
            },

            {
                id: "b",
                text: "A Database"
            },

            {
                id: "c",
                text: "A CSS Framework"
            },

            {
                id: "d",
                text: "An Operating System"
            }

        ],

        correctAnswer: "a"

    },

    {

        id: "2",

        question: "Which HTTP method updates a resource?",

        options: [

            {
                id: "a",
                text: "GET"
            },

            {
                id: "b",
                text: "POST"
            },

            {
                id: "c",
                text: "PUT"
            },

            {
                id: "d",
                text: "DELETE"
            }

        ],

        correctAnswer: "c"

    },

    {

        id: "3",

        question: "What is PostgreSQL?",

        options: [

            {
                id: "a",
                text: "Database"
            },

            {
                id: "b",
                text: "Frontend Library"
            },

            {
                id: "c",
                text: "Operating System"
            },

            {
                id: "d",
                text: "Programming Language"
            }

        ],

        correctAnswer: "a"

    }

];

///////////////////////////////////////////////////////////////
// COMPONENT
///////////////////////////////////////////////////////////////

export default function CandidateQuiz({

    applicationId,

    onCompleted,

}: CandidateQuizProps) {

    ///////////////////////////////////////////////////////////
    // STATE
    ///////////////////////////////////////////////////////////

    const [questions] = useState(DEMO_QUESTIONS);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [answers, setAnswers] = useState<Record<string, string>>({});

    const [timeRemaining, setTimeRemaining] = useState(15 * 60);

    const [quizFinished, setQuizFinished] = useState(false);

    const [loading, setLoading] = useState(false);

    ///////////////////////////////////////////////////////////
    // CURRENT QUESTION
    ///////////////////////////////////////////////////////////

    const currentQuestion = useMemo(() => {

        return questions[currentQuestionIndex];

    }, [questions, currentQuestionIndex]);

    ///////////////////////////////////////////////////////////
    // TIMER
    ///////////////////////////////////////////////////////////

    useEffect(() => {

        if (quizFinished) return;

        if (timeRemaining <= 0) {

            handleFinishQuiz();

            return;

        }

        const timer = setInterval(() => {

            setTimeRemaining(previous => previous - 1);

        }, 1000);

        return () => clearInterval(timer);

    }, [timeRemaining, quizFinished]);

    ///////////////////////////////////////////////////////////
    // FORMAT TIME
    ///////////////////////////////////////////////////////////

    const formatTime = (seconds: number) => {

        const minutes = Math.floor(seconds / 60);

        const remaining = seconds % 60;

        return `${minutes.toString().padStart(2, "0")}:${remaining
            .toString()
            .padStart(2, "0")}`;

    };

    ///////////////////////////////////////////////////////////
    // SELECT ANSWER
    ///////////////////////////////////////////////////////////

    const handleSelectAnswer = (

        questionId: string,

        answerId: string

    ) => {

        setAnswers(previous => ({

            ...previous,

            [questionId]: answerId,

        }));

    };

    ///////////////////////////////////////////////////////////
    // NAVIGATION
    ///////////////////////////////////////////////////////////

    const goToNextQuestion = () => {

        if (currentQuestionIndex >= questions.length - 1) return;

        setCurrentQuestionIndex(previous => previous + 1);

    };

    ///////////////////////////////////////////////////////////

    const goToPreviousQuestion = () => {

        if (currentQuestionIndex <= 0) return;

        setCurrentQuestionIndex(previous => previous - 1);

    };

    ///////////////////////////////////////////////////////////
    // SCORE
    ///////////////////////////////////////////////////////////

    const calculateScore = () => {

        let correct = 0;

        questions.forEach(question => {

            if (answers[question.id] === question.correctAnswer) {

                correct++;

            }

        });

        return Math.round(

            (correct / questions.length) * 100

        );

    };

    ///////////////////////////////////////////////////////////
    // FINISH QUIZ
    ///////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////
    // Quiz Payload
    /////////////////////////////////////////////////////////////

    const quizPayload = useMemo(() => {

        return {

            applicationId,

            answers,

            score: calculateScore(),

            submittedAt: new Date().toISOString(),

        };

    }, [

        applicationId,

        answers

    ]);

    /////////////////////////////////////////////////////////////
    // FINISH QUIZ
    /////////////////////////////////////////////////////////////

    const handleFinishQuiz = async () => {
        if (quizFinished) return;

        try {

            setLoading(true);

            const score = calculateScore();

            //////////////////////////////////////////////////////
            // Future Express API
            //////////////////////////////////////////////////////

            /*
            await quizService.submitQuiz({

                applicationId,

                answers,

                score

            });
            */

            //////////////////////////////////////////////////////
            // Temporary Local Result
            //////////////////////////////////////////////////////

            console.log("Application:", applicationId);

            console.log("Answers:", answers);

            console.log("Score:", score);

            //////////////////////////////////////////////////////

            setQuizFinished(true);

            onCompleted?.(score);

        }

        catch (error) {

            console.error(error);

        }

        finally {

            setLoading(false);

        }

    };

    ///////////////////////////////////////////////////////////
    // JSX STARTS IN PART 2
    ///////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////
    // Future API
    /////////////////////////////////////////////////////////////

    const submitQuiz = async () => {

        /*
        POST

        /api/quiz/submit

        Body

        {

            applicationId,

            answers,

            score

        }

        */

        console.log(quizPayload);

    };

    return (

        <div className="max-w-5xl mx-auto space-y-8">

            {/* ================================================= */}
            {/* Header */}
            {/* ================================================= */}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                    <div>

                        <div className="flex items-center gap-3">

                            <div className="w-14 h-14 rounded-full bg-[#173E7D] flex items-center justify-center">

                                <Brain
                                    className="text-white"
                                    size={28}
                                />

                            </div>

                            <div>

                                <h1 className="text-3xl font-black text-[#173E7D]">

                                    AI Candidate Quiz

                                </h1>

                                <p className="text-gray-500 mt-1">

                                    This quiz has been generated according to your CV.

                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-6 py-4 rounded-2xl">

                        <Clock
                            className="text-red-600"
                            size={24}
                        />

                        <div>

                            <p className="text-xs text-red-500">

                                Remaining Time

                            </p>

                            <h2 className="text-2xl font-black text-red-600">

                                {formatTime(timeRemaining)}

                            </h2>

                        </div>

                    </div>

                </div>

            </div>

            {/* ================================================= */}
            {/* Progress */}
            {/* ================================================= */}

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

                <div className="flex justify-between items-center">

                    <h2 className="font-bold text-[#173E7D]">

                        Question

                        {currentQuestionIndex + 1}

                        /

                        {questions.length}

                    </h2>

                    <span className="text-sm text-gray-500">

                        {Math.round(

                            ((currentQuestionIndex + 1) /

                                questions.length) *

                                100

                        )}

                        %

                    </span>

                </div>

                <div className="w-full h-3 rounded-full bg-gray-200 mt-5 overflow-hidden">

                    <div

                        className="h-full bg-[#173E7D] transition-all duration-500"

                        style={{

                            width: `${

                                ((currentQuestionIndex + 1) /

                                    questions.length) *

                                100

                            }%`

                        }}

                    />

                </div>

            </div>

            {/* ================================================= */}
            {/* Question */}
            {/* ================================================= */}

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">

                <h2 className="text-2xl font-bold text-[#173E7D]">

                    {currentQuestion.question}

                </h2>

                <div className="mt-8 space-y-5">

                    {currentQuestion.options.map(option => {

                        const selected =

                            answers[currentQuestion.id] === option.id;

                        return (

                            <button

                                key={option.id}

                                onClick={() =>

                                    handleSelectAnswer(

                                        currentQuestion.id,

                                        option.id

                                    )

                                }

                                className={`

                                w-full

                                text-left

                                p-5

                                rounded-2xl

                                border-2

                                transition-all

                                duration-200

                                ${

                                    selected

                                        ? "border-[#173E7D] bg-blue-50"

                                        : "border-gray-200 hover:border-[#173E7D]"

                                }

                                `}

                            >

                                <div className="flex items-center gap-5">

                                    <div

                                        className={`

                                        w-10

                                        h-10

                                        rounded-full

                                        flex

                                        items-center

                                        justify-center

                                        font-bold

                                        ${

                                            selected

                                                ? "bg-[#173E7D] text-white"

                                                : "bg-gray-100"

                                        }

                                        `}

                                    >

                                        {option.id.toUpperCase()}

                                    </div>

                                    <span className="text-lg">

                                        {option.text}

                                    </span>

                                </div>

                            </button>

                        );

                    })}

                </div>

            </div>

            {/* ================================================= */}
            {/* Navigation */}
            {/* ================================================= */}

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

                <div className="flex justify-between">

                    <button

                        onClick={goToPreviousQuestion}

                        disabled={currentQuestionIndex === 0}

                        className="flex items-center gap-3 px-6 py-3 rounded-xl border border-gray-300 disabled:opacity-40"

                    >

                        <ChevronLeft size={20} />

                        Previous

                    </button>

                    {currentQuestionIndex < questions.length - 1 ? (

                        <button

                            onClick={goToNextQuestion}

                            className="flex items-center gap-3 px-8 py-3 rounded-xl bg-[#173E7D] text-white font-bold"

                        >

                            Next

                            <ChevronRight size={20} />

                        </button>

                    ) : (

                        <button

                            onClick={async () => {

                                await submitQuiz();

                                await handleFinishQuiz();

                            }}

                            disabled={loading}

                            className="flex items-center gap-3 px-8 py-3 rounded-xl bg-green-600 text-white font-bold"

                        >

                            <CheckCircle2 size={20} />

                            Finish Quiz

                        </button>

                    )}

                </div>

            </div>

            {/* ================================================= */}
            {/* Loading */}
            {/* ================================================= */}

            {loading && (

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center">

                    <Brain

                        className="animate-pulse mx-auto text-[#173E7D]"

                        size={60}

                    />

                    <h2 className="text-xl font-bold text-[#173E7D] mt-6">

                        Calculating your score...

                    </h2>

                    <p className="text-gray-500 mt-2">

                        Please wait while we evaluate your answers.

                    </p>

                </div>

            )}

            {/* ================================================= */}
            {/* Quiz Result */}
            {/* ================================================= */}

            {quizFinished && !loading && (

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10">

                    {(() => {

                        const score = calculateScore();

                        const correctAnswers = Math.round(
                            (score / 100) * questions.length
                        );

                        const passed = score >= 70;

                        return (

                            <>

                                {/* Trophy */}

                                <div className="flex justify-center">

                                    <div
                                        className={`
                                        w-28
                                        h-28
                                        rounded-full
                                        flex
                                        items-center
                                        justify-center
                                        ${
                                            passed
                                                ? "bg-green-100"
                                                : "bg-red-100"
                                        }
                                    `}
                                    >

                                        <Trophy
                                            size={56}
                                            className={
                                                passed
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }
                                        />

                                    </div>

                                </div>

                                {/* Title */}

                                <div className="text-center mt-8">

                                    <h1
                                        className={`
                                        text-4xl
                                        font-black
                                        ${
                                            passed
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }
                                    `}
                                    >

                                        {passed
                                            ? "Congratulations!"
                                            : "Quiz Completed"}

                                    </h1>

                                    <p className="text-gray-500 mt-3">

                                        {passed
                                            ? "You successfully passed the AI assessment."
                                            : "You can improve your score in future assessments."}

                                    </p>

                                </div>

                                {/* Score */}

                                <div className="mt-12">

                                    <div className="w-52 h-52 mx-auto rounded-full border-[14px] border-[#173E7D] flex items-center justify-center">

                                        <div className="text-center">

                                            <h2 className="text-6xl font-black text-[#173E7D]">

                                                {score}

                                            </h2>

                                            <p className="text-gray-500">

                                                %

                                            </p>

                                        </div>

                                    </div>

                                </div>

                                {/* Statistics */}

                                <div className="grid md:grid-cols-3 gap-6 mt-12">

                                    <div className="rounded-2xl bg-blue-50 p-6 text-center">

                                        <h3 className="text-sm text-gray-500">

                                            Questions

                                        </h3>

                                        <p className="text-3xl font-black text-[#173E7D] mt-2">

                                            {questions.length}

                                        </p>

                                    </div>

                                    <div className="rounded-2xl bg-green-50 p-6 text-center">

                                        <h3 className="text-sm text-gray-500">

                                            Correct

                                        </h3>

                                        <p className="text-3xl font-black text-green-600 mt-2">

                                            {correctAnswers}

                                        </p>

                                    </div>

                                    <div className="rounded-2xl bg-red-50 p-6 text-center">

                                        <h3 className="text-sm text-gray-500">

                                            Incorrect

                                        </h3>

                                        <p className="text-3xl font-black text-red-600 mt-2">

                                            {questions.length - correctAnswers}

                                        </p>

                                    </div>

                                </div>

                                {/* Status */}

                                <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">

                                    <div className="flex justify-between items-center">

                                        <span className="font-semibold">

                                            Assessment Result

                                        </span>

                                        <span
                                            className={`
                                            px-5
                                            py-2
                                            rounded-full
                                            font-bold
                                            ${
                                                passed
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }
                                        `}
                                        >

                                            {passed
                                                ? "PASSED"
                                                : "FAILED"}

                                        </span>

                                    </div>

                                </div>

                            </>

                        );

                    })()}

                </div>

            )}
            <div className="py-12 text-center">

                <p className="text-gray-400 text-sm">

                    Dar L'Emploi

                    •

                    AI Recruitment Platform

                    •

                    Candidate Quiz Module

                </p>

            </div>
        </div>

    );

}
