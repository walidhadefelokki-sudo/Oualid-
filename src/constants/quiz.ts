///////////////////////////////////////////////////////////////
// QUIZ CONFIGURATION
///////////////////////////////////////////////////////////////

export const QUIZ_DURATION_MINUTES = 15;

export const QUIZ_DURATION_SECONDS =
  QUIZ_DURATION_MINUTES * 60;

export const DEFAULT_PASSING_SCORE = 70;

export const DEFAULT_NUMBER_OF_QUESTIONS = 10;

export const MAX_NUMBER_OF_QUESTIONS = 30;

export const MIN_NUMBER_OF_QUESTIONS = 5;

///////////////////////////////////////////////////////////////
// TIMER
///////////////////////////////////////////////////////////////

export const WARNING_TIME = 5 * 60;

export const CRITICAL_TIME = 60;

export const AUTO_SUBMIT_ON_TIMEOUT = true;

///////////////////////////////////////////////////////////////
// SCORING
///////////////////////////////////////////////////////////////

export const EASY_WEIGHT = 1;

export const MEDIUM_WEIGHT = 2;

export const HARD_WEIGHT = 3;

export const NEGATIVE_MARKING = false;

export const NEGATIVE_MARKING_PENALTY = 0.25;

///////////////////////////////////////////////////////////////
// DIFFICULTY
///////////////////////////////////////////////////////////////

export const QUESTION_DIFFICULTY = {

  EASY: "easy",

  MEDIUM: "medium",

  HARD: "hard",

} as const;

///////////////////////////////////////////////////////////////
// QUIZ STATUS
///////////////////////////////////////////////////////////////

export const QUIZ_STATUS = {

  IDLE: "idle",

  LOADING: "loading",

  READY: "ready",

  RUNNING: "running",

  PAUSED: "paused",

  COMPLETED: "completed",

  SUBMITTED: "submitted",

  EXPIRED: "expired",

  ERROR: "error",

} as const;

///////////////////////////////////////////////////////////////
// APPLICATION STATUS
///////////////////////////////////////////////////////////////

export const APPLICATION_STATUS = {

  PENDING: "PENDING",

  REVIEWING: "REVIEWING",

  SHORTLISTED: "SHORTLISTED",

  INTERVIEW: "INTERVIEW",

  HIRED: "HIRED",

  REJECTED: "REJECTED",

} as const;

///////////////////////////////////////////////////////////////
// QUIZ MODES
///////////////////////////////////////////////////////////////

export const QUIZ_MODE = {

  PRACTICE: "practice",

  ASSESSMENT: "assessment",

  CERTIFICATION: "certification",

} as const;

///////////////////////////////////////////////////////////////
// QUIZ TYPES
///////////////////////////////////////////////////////////////

export const QUIZ_TYPE = {

  AI: "ai",

  TECHNICAL: "technical",

  CODING: "coding",

  LANGUAGE: "language",

  PERSONALITY: "personality",

  CUSTOM: "custom",

} as const;

///////////////////////////////////////////////////////////////
// QUESTION STATUS
///////////////////////////////////////////////////////////////

export const QUESTION_STATUS = {

  ANSWERED: "answered",

  UNANSWERED: "unanswered",

  CURRENT: "current",

} as const;

///////////////////////////////////////////////////////////////
// AI SETTINGS
///////////////////////////////////////////////////////////////

export const AI_SETTINGS = {

  ENABLE_AI_GENERATION: true,

  ENABLE_AI_EXPLANATIONS: true,

  ENABLE_FOLLOW_UP_QUESTIONS: true,

  ENABLE_INTERVIEW_GENERATION: true,

  ENABLE_SKILL_ANALYSIS: true,

};

///////////////////////////////////////////////////////////////
// SHUFFLING
///////////////////////////////////////////////////////////////

export const SHUFFLE = {

  QUESTIONS: true,

  OPTIONS: true,

};

///////////////////////////////////////////////////////////////
// RETRY
///////////////////////////////////////////////////////////////

export const QUIZ_RETRY = {

  ENABLED: false,

  MAX_ATTEMPTS: 1,

};

///////////////////////////////////////////////////////////////
// STORAGE
///////////////////////////////////////////////////////////////

export const STORAGE_KEYS = {

  QUIZ_PROGRESS: "quiz-progress",

  QUIZ_ANSWERS: "quiz-answers",

  QUIZ_TIMER: "quiz-timer",

};

///////////////////////////////////////////////////////////////
// UI
///////////////////////////////////////////////////////////////

export const UI = {

  PROGRESS_ANIMATION_MS: 400,

  TIMER_UPDATE_MS: 1000,

};

///////////////////////////////////////////////////////////////
// API
///////////////////////////////////////////////////////////////

export const API_ENDPOINTS = {

  QUIZ: "/quiz",

  QUIZ_SUBMIT: "/quiz/submit",

  QUIZ_RESULT: "/quiz/result",

  AI_GENERATE: "/ai/quiz/generate",

  AI_ANALYZE_CV: "/ai/cv/analyze",

};

///////////////////////////////////////////////////////////////
// COLORS
///////////////////////////////////////////////////////////////

export const QUIZ_COLORS = {

  PRIMARY: "#173E7D",

  SUCCESS: "#16A34A",

  WARNING: "#F59E0B",

  DANGER: "#DC2626",

  INFO: "#2563EB",

};

///////////////////////////////////////////////////////////////
// ICONS
///////////////////////////////////////////////////////////////

export const QUIZ_ICONS = {

  SUCCESS: "CheckCircle2",

  ERROR: "XCircle",

  TIMER: "Clock",

  QUESTION: "CircleHelp",

  QUIZ: "Brain",

};

///////////////////////////////////////////////////////////////
// MESSAGES
///////////////////////////////////////////////////////////////

export const QUIZ_MESSAGES = {

  START:

    "Your AI assessment is ready.",

  FINISH:

    "Quiz completed successfully.",

  SUBMIT:

    "Submitting your answers...",

  LOADING:

    "Preparing your AI assessment...",

  EMPTY:

    "No quiz available.",

  ERROR:

    "Something went wrong.",

  TIMEOUT:

    "Time is up. Your quiz has been submitted automatically.",

};

///////////////////////////////////////////////////////////////
// DEFAULT EXPORT
///////////////////////////////////////////////////////////////

const QuizConstants = {

  QUIZ_DURATION_MINUTES,

  QUIZ_DURATION_SECONDS,

  DEFAULT_PASSING_SCORE,

  DEFAULT_NUMBER_OF_QUESTIONS,

  WARNING_TIME,

  CRITICAL_TIME,

  AUTO_SUBMIT_ON_TIMEOUT,

  QUESTION_DIFFICULTY,

  QUIZ_STATUS,

  APPLICATION_STATUS,

  QUIZ_MODE,

  QUIZ_TYPE,

  QUESTION_STATUS,

  AI_SETTINGS,

  SHUFFLE,

  QUIZ_RETRY,

  STORAGE_KEYS,

  UI,

  API_ENDPOINTS,

  QUIZ_COLORS,

  QUIZ_MESSAGES,

};

export default QuizConstants;