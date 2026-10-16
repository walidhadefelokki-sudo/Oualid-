import axios from "axios";

// The backend is always served from the same origin as the frontend
// (server.ts serves both together in dev/plain-Node prod, and on Vercel
// vercel.json rewrites /api/* to the serverless function). So the safe
// default is a relative "/api" path, which works out of the box in every
// deployment without needing VITE_API_URL configured. Only set
// VITE_API_URL if the API is genuinely hosted on a different origin.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Rejects an API response that came back as a web page.
 *
 * Both the dev server and Vercel fall back to index.html for any path they
 * do not recognise, and they do it with status 200. So a request to an
 * endpoint that does not exist — a server running code older than the
 * frontend, a route renamed, a rewrite misconfigured — resolves
 * *successfully* with HTML, and every caller then reads undefined out of it.
 *
 * That turns a missing endpoint into a screen stuck on "Chargement…" with
 * nothing in the console, which is far harder to diagnose than a failure.
 * Here it becomes an ordinary error, so the existing catch handles it and
 * the user sees something they can act on.
 */
api.interceptors.response.use((response) => {
  const type = response.headers?.["content-type"];
  if (typeof type === "string" && type.includes("text/html")) {
    return Promise.reject(
      new Error(
        `L'API a renvoyé une page HTML pour ${response.config?.url}. ` +
          `L'endpoint n'existe pas sur ce serveur — redémarrez-le si vous venez de le mettre à jour.`
      )
    );
  }
  return response;
});

export default api;
