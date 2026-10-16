import React, { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import logoNavy from "../../assets/logo-v2.png";

/**
 * Sign in and register, inside the marketplace.
 *
 * The marketplace used to send people to the recruitment app's login and
 * they never came back: it signs them in, drops them on the recruitment
 * dashboard, and whatever they were doing here is lost. Same accounts, same
 * endpoints, same token — only the screen is local, so the journey ends
 * where it started.
 *
 * `?next=` carries where to return to. It is read as a path and never as a
 * full URL: an open redirect is how a login page becomes a phishing step.
 */

const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 outline-none focus:border-[#173E7D]";

const label =
  "block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5";

/** Only same-site paths. Anything else falls back to the workspace. */
const safeNext = (raw: string | null): string => {
  if (!raw) return "/freelance-espace";
  // Must start with a single slash. "//evil.com" and "https://evil.com" are
  // both absolute destinations once the browser resolves them.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/freelance-espace";
  return raw;
};

const SignIn: React.FC<{ mode?: "signin" | "signup" }> = ({ mode = "signin" }) => {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const isSignUp = mode === "signup";
  const next = safeNext(params.get("next"));

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp && form.password !== form.confirmPassword) {
      return setError("Les mots de passe ne correspondent pas.");
    }
    if (isSignUp && form.password.length < 8) {
      return setError("Le mot de passe doit faire au moins 8 caractères.");
    }

    setBusy(true);
    try {
      const { data } = isSignUp
        ? await api.post("/auth/register", {
            email: form.email.trim(),
            password: form.password,
            // A marketplace signup is a person, not a company. They become a
            // freelancer by activating a profile, not by their account role.
            role: "CANDIDATE",
            firstName: form.firstName.trim() || undefined,
            lastName: form.lastName.trim() || undefined,
          })
        : await api.post("/auth/login", {
            email: form.email.trim(),
            password: form.password,
          });

      localStorage.setItem("token", data.token);
      // Waited for, so the next screen renders with the user already known
      // rather than flashing its signed-out state first.
      await refresh();
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (isSignUp ? "L'inscription a échoué." : "La connexion a échoué.")
      );
    } finally {
      setBusy(false);
    }
  };

  /* Google returns to the recruitment app's callback, which is where the
   * handler lives. `next` rides along so that callback can send the user
   * back here afterwards. */
  const googleHref = `/api/auth/google?next=${encodeURIComponent(
    `/freelance${next}`
  )}`;

  const otherMode = isSignUp
    ? { to: "/connexion", label: t("nav.signin"), prompt: "Vous avez déjà un compte ?" }
    : { to: "/inscription", label: t("nav.signup"), prompt: "Pas encore de compte ?" };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-3xl border-2 border-[#173E7D]/15 bg-white p-7 sm:p-9">
        <img src={logoNavy} alt="Dar L'Emploi" className="h-9 w-auto mx-auto" />

        <h1 className="mt-6 text-2xl font-display font-bold text-[#173E7D] text-center">
          {isSignUp ? t("nav.signup") : t("nav.signin")}
        </h1>
        <p className="mt-1 text-sm text-[#2B3442]/60 text-center">
          Un seul compte pour l'emploi et le freelance.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {isSignUp && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Prénom</span>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={field}
                  autoComplete="given-name"
                />
              </label>
              <label className="block">
                <span className={label}>Nom</span>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={field}
                  autoComplete="family-name"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className={label}>E-mail</span>
            <input
              type="email"
              required
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className={label}>Mot de passe</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`${field} pe-12`}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer" : "Afficher"}
                className="absolute top-1/2 -translate-y-1/2 end-4 text-[#173E7D]/40"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {isSignUp && (
            <label className="block">
              <span className={label}>Confirmer le mot de passe</span>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={field}
                autoComplete="new-password"
              />
            </label>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#173E7D] text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {isSignUp ? t("nav.signup") : t("nav.signin")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-[#2B3442]/40">
          <span className="h-px flex-1 bg-[#173E7D]/10" />
          ou
          <span className="h-px flex-1 bg-[#173E7D]/10" />
        </div>

        {/* A normal link, not fetch: OAuth is a browser redirect. */}
        <a
          href={googleHref}
          className="w-full rounded-xl border-2 border-[#173E7D]/15 font-bold py-3.5 flex items-center justify-center gap-3 text-[#2B3442] hover:border-[#173E7D]/40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
            />
          </svg>
          Continuer avec Google
        </a>

        <p className="mt-6 text-sm text-center text-[#2B3442]/60">
          {otherMode.prompt}{" "}
          <Link
            to={`${otherMode.to}${location.search}`}
            className="font-bold text-[#173E7D] hover:underline"
          >
            {otherMode.label}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
