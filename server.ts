import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app";

async function startServer() {
  const app = createApp();
  const PORT = process.env.PORT || 3000;

  // Vite middleware for local development, or static file serving for a
  // plain `node dist/server.cjs` production run (e.g. Render/Railway).
  // Not used on Vercel — there the built frontend is served as static
  // files directly by Vercel, and this whole file isn't invoked at all
  // (see api/index.ts for the serverless entry point).
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
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
