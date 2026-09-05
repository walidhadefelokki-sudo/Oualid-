import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

/** Error codes the backend redirects with, mapped to something a person can act on. */
const ERROR_MESSAGES: Record<string, { fr: string; ar: string }> = {
  cancelled: {
    fr: "Connexion annulée. Vous n'avez pas autorisé l'accès à votre compte Google.",
    ar: 'تم إلغاء تسجيل الدخول. لم تمنح الإذن لحسابك على Google.',
  },
  no_email: {
    fr: "Votre compte Google n'expose pas d'adresse email. Utilisez l'inscription par email.",
    ar: 'حساب Google الخاص بك لا يوفر عنوان بريد إلكتروني. استخدم التسجيل بالبريد.',
  },
  email_in_use: {
    fr: 'Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.',
    ar: 'يوجد حساب بهذا البريد. سجّل الدخول بكلمة المرور.',
  },
  invalid_state: {
    fr: 'La session de connexion a expiré. Veuillez réessayer.',
    ar: 'انتهت صلاحية جلسة الدخول. حاول مرة أخرى.',
  },
  not_configured: {
    fr: "La connexion Google n'est pas configurée sur ce serveur.",
    ar: 'لم يتم إعداد الدخول عبر Google على هذا الخادم.',
  },
  provider_error: {
    fr: 'Google a refusé la connexion. Veuillez réessayer.',
    ar: 'رفضت Google تسجيل الدخول. حاول مرة أخرى.',
  },
  server_error: {
    fr: 'Une erreur est survenue pendant la connexion. Veuillez réessayer.',
    ar: 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.',
  },
};

interface GoogleAuthCallbackProps {
  language: 'fr' | 'ar';
  /** Receives the session exactly as the email/password flow delivers it. */
  onAuthSuccess: (payload: { token: string; user: any }) => void;
  onFailure: () => void;
}

/**
 * Lands here after Google. Exchanges the short-lived HttpOnly handoff cookie
 * the backend set for the application's JWT, then hands that to the same
 * callback the password login uses — so from here on nothing downstream knows
 * or cares which provider was used.
 */
export default function GoogleAuthCallback({
  language,
  onAuthSuccess,
  onFailure,
}: GoogleAuthCallbackProps) {
  const isRTL = language === 'ar';
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const [error, setError] = useState<string | null>(null);
  // React 18 mounts effects twice in development; the handoff cookie is
  // single-use, so a second exchange would fail and show a false error.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');

    if (errorCode) {
      const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.server_error;
      setError(message[language]);
      return;
    }

    api
      .post('/auth/google/session')
      .then(({ data }) => {
        localStorage.setItem('token', data.token);
        // Clear the callback path so a refresh doesn't retry a spent cookie.
        window.history.replaceState({}, '', '/');
        onAuthSuccess({ token: data.token, user: data.data.user });
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ??
            t('La connexion a échoué. Veuillez réessayer.', 'فشل تسجيل الدخول. حاول مرة أخرى.')
        );
      });
  }, [language, onAuthSuccess]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#F8FAFB] flex items-center justify-center p-6"
    >
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-12 max-w-md w-full text-center">
        {!error ? (
          <>
            <div className="w-14 h-14 mx-auto mb-6 border-4 border-gray-100 border-t-[#F68D58] rounded-full animate-spin" />
            <h1 className="text-2xl font-black text-[#173E7D] mb-2">
              {t('Connexion en cours…', 'جارٍ تسجيل الدخول…')}
            </h1>
            <p className="text-gray-400 font-medium">
              {t('Finalisation de votre connexion Google.', 'جارٍ إتمام الدخول عبر Google.')}
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl font-black">
              !
            </div>
            <h1 className="text-2xl font-black text-[#173E7D] mb-3">
              {t('Connexion impossible', 'تعذر تسجيل الدخول')}
            </h1>
            <p className="text-gray-500 font-medium mb-8">{error}</p>
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/');
                onFailure();
              }}
              className="w-full bg-[#173E7D] text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#F68D58] transition-all"
            >
              {t("Retour à l'accueil", 'العودة إلى الرئيسية')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
