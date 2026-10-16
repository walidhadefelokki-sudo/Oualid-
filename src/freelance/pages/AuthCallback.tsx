import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import logoNavy from "../../assets/logo-v2.png";

/**
 * Where Google returns to, for the marketplace.
 *
 * The recruitment app has its own callback page at /auth/callback. Sending
 * marketplace sign-ins through it meant the recruitment application mounted,
 * rendered, and only then forwarded here — a visible flash of the other
 * product in the middle of signing in to this one.
 *
 * Same mechanism, same one-minute HttpOnly handoff cookie, same endpoint.
 * Only the screen belongs to the marketplace.
 */

const ERRORS: Record<string, string> = {
  invalid_state: "La session de connexion a expiré. Réessayez.",
  provider_error: "Google n'a pas répondu. Réessayez dans un instant.",
  cancelled: "Connexion annulée.",
  no_email: "Ce compte Google ne partage pas d'adresse e-mail.",
  email_in_use: "Un compte existe déjà avec cette adresse. Connectez-vous avec votre mot de passe.",
  server_error: "Une erreur est survenue. Réessayez.",
};

/** Only same-site paths, and only inside the marketplace. */
const safeNext = (raw: string | null): string => {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/freelance-espace";
  // The router's basename is /freelance, so a path arriving with that prefix
  // has to lose it or it would resolve to /freelance/freelance/...
  return raw.startsWith("/freelance/")
    ? raw.slice("/freelance".length)
    : raw === "/freelance"
      ? "/"
      : raw;
};

const AuthCallback: React.FC = () => {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const failed = params.get("error");
    if (failed) {
      setError(ERRORS[failed] ?? ERRORS.server_error);
      return;
    }

    let cancelled = false;

    api
      .post("/auth/google/session")
      .then(async ({ data }) => {
        if (cancelled) return;
        localStorage.setItem("token", data.token);
        await refresh();
        navigate(safeNext(params.get("next")), { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? ERRORS.server_error);
      });

    return () => {
      cancelled = true;
    };
    // Runs once: the handoff cookie is cleared on use, so a second attempt
    // would fail on a spent credential.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <img src={logoNavy} alt="Dar L'Emploi" className="h-9 w-auto mx-auto" />

      {error ? (
        <>
          <p className="mt-8 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-4">
            {error}
          </p>
          <Link
            to="/connexion"
            className="inline-block mt-6 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
          >
            {t("nav.signin")}
          </Link>
        </>
      ) : (
        <div className="mt-10 flex items-center justify-center gap-3 text-[#173E7D]/60">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-semibold">{t("common.loading")}</span>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
