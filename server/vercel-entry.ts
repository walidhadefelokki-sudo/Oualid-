import { createApp } from "./app";

// Vercel's Node runtime accepts a default-exported request handler with
// the signature (req, res) => void — an Express app already matches
// that shape, so we can hand it directly to Vercel with no adapter.
//
// Every request to /api/* on your Vercel deployment is routed here per
// vercel.json's rewrite rule, and Express's own routing (app.use("/api/auth", ...)
// etc., defined in server/app.ts) takes it from there.
//
// This file is NOT the deployed function. vercel.json's buildCommand runs
// esbuild over it to produce a single self-contained api/index.js (which is
// gitignored). That bundling step is required: package.json sets
// "type": "module", so Vercel emits ESM, and ESM cannot resolve the
// extensionless relative imports ("./app") used throughout this codebase —
// the function crashed at startup with ERR_MODULE_NOT_FOUND. Bundling
// inlines every relative import, leaving only bare package specifiers that
// Node resolves from node_modules at runtime.
const app = createApp();

export default app;
