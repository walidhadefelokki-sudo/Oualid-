import { createApp } from "../server/app";

// Vercel's Node runtime accepts a default-exported request handler with
// the signature (req, res) => void — an Express app already matches
// that shape, so we can hand it directly to Vercel with no adapter.
//
// Every request to /api/* on your Vercel deployment is routed here per
// vercel.json's rewrite rule, and Express's own routing (app.use("/api/auth", ...)
// etc., defined in server/app.ts) takes it from there.
const app = createApp();

export default app;
