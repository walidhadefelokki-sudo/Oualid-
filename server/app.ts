import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import passport from "./config/passport";
import { configureGoogleStrategy } from "./config/passport";
import authRoutes from "./routes/auth.routes";
import jobRoutes from "./routes/job.routes";
import categoryRoutes from "./routes/category.routes";
import applicationRoutes from "./routes/application.routes";
import contactRoutes from "./routes/contact.routes";
import adminRoutes from "./routes/admin.routes";
import preselectionRoutes from "./routes/preselection.routes";
import oralPresentationRoutes from "./routes/oralPresentation.routes";
import quizRoutes from "./routes/quiz.routes";
import aiAnalysisRoutes from "./routes/aiAnalysis.routes";
import candidateProfileRoutes from "./routes/candidateProfile.routes";
import candidateScoreRoutes from "./routes/candidateScore.routes";
import notificationRoutes from "./routes/notification.routes";
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET is not set. Falling back to an insecure default — " +
      "set JWT_SECRET in your environment before deploying to production."
  );
}

// Builds a fully configured Express app with every /api/* route mounted,
// but does NOT call app.listen() and does NOT serve the frontend
// (no Vite dev middleware, no static file serving, no SPA fallback).
//
// - The local dev server (server.ts) adds Vite dev middleware + listen()
//   on top of this, so `npm run dev` still serves frontend + backend
//   together exactly as before.
// - The Vercel serverless function (api/index.ts) uses this app as-is;
//   Vercel serves the built frontend (dist/) as static files separately,
//   routed by vercel.json.
export function createApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.use(helmet());
  } else {
    // Relaxed CSP in dev so Vite's inline preamble script/HMR socket,
    // Google Fonts, remote images (Cloudinary/Supabase), and
    // Firebase Auth + Firestore realtime connections aren't blocked.
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: [
              "'self'",
              "ws:",
              "http://localhost:*",
              "ws://localhost:*",
              "https://*.googleapis.com",
              "https://apis.google.com",
              "https://*.firebaseio.com",
              "wss://*.firebaseio.com",
              "https://*.cloudfunctions.net",
              "https://*.supabase.co",
              "https://res.cloudinary.com",
            ],
            frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
          },
        },
      })
    );
  }

  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  app.use(express.json());

  // OAuth uses two short-lived HttpOnly cookies (state nonce, token handoff),
  // so the callback can be verified and the JWT delivered without ever
  // putting it in a URL.
  app.use(cookieParser());

  // Passport performs the Google handshake only — no sessions. The app keeps
  // its own stateless JWT, so passport.session() is deliberately not used.
  app.use(passport.initialize());
  if (!configureGoogleStrategy()) {
    console.warn(
      "⚠️  Google sign-in is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL). Email+password login is unaffected."
    );
  }

  // Brute-force protection on auth endpoints.
  // Note: express-rate-limit's default store is in-memory, which is
  // per-instance. On Vercel serverless this resets across cold starts
  // and isn't shared across concurrent instances, so it's a soft
  // best-effort limit there rather than a hard guarantee. Fine to start
  // with; swap in a shared store (e.g. Redis/Upstash) later if you need
  // it enforced strictly in production.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many attempts. Please try again later.",
    },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/preselection", preselectionRoutes);
  app.use("/api/oral-presentations", oralPresentationRoutes);
  app.use("/api/quiz", quizRoutes);
  app.use("/api/ai-analysis", aiAnalysisRoutes);
  app.use("/api/candidates", candidateProfileRoutes);
  app.use("/api/candidate-scores", candidateScoreRoutes);
  app.use("/api/notifications", notificationRoutes);

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
