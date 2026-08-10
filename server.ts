import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import authRoutes from "./server/routes/auth.routes";
import jobRoutes from "./server/routes/job.routes";
import applicationRoutes from "./server/routes/application.routes";
import contactRoutes from "./server/routes/contact.routes";
import adminRoutes from "./server/routes/admin.routes";
import preselectionRoutes from "./server/routes/preselection.routes";
import oralPresentationRoutes from "./server/routes/oralPresentation.routes";
import quizRoutes from "./server/routes/quiz.routes";
import aiAnalysisRoutes from "./server/routes/aiAnalysis.routes";
import candidateProfileRoutes from "./server/routes/candidateProfile.routes";
import candidateScoreRoutes from "./server/routes/candidateScore.routes";
import notificationRoutes from "./server/routes/notification.routes";
import { errorHandler } from "./server/middleware/error.middleware";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET is not set. Falling back to an insecure default — " +
      "set JWT_SECRET in your environment before deploying to production."
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Brute-force protection on auth endpoints
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});