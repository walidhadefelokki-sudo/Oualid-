import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail, X } from 'lucide-react';
import api from '../services/api';

/**
 * Confirming an email address, from the user's side.
 *
 * Two jobs that belong together. It spends the token when someone arrives from
 * the link in their welcome email, and it nags the ones who have not clicked
 * it yet — because the nag is the only thing that makes the account status
 * mean anything, and the two share every string.
 *
 * Rendered beside each top-level view rather than inside one: the link lands
 * on the site root whether or not the person is signed in, and a signed-in
 * user should see the reminder on the landing page as well as the dashboard.
 *
 * It is a fixed card at the bottom rather than a bar at the top: the nav is
 * already fixed up there, and an unconfirmed address blocks nothing, so it
 * does not deserve to push the page down.
 */

type Lang = 'fr' | 'ar';

interface Props {
  language: Lang;
  /** Signed in with an address that has not been confirmed. */
  unverified: boolean;
  /** Called after a successful confirmation, so the session can stop nagging. */
  onConfirmed?: () => void;
}

const LABELS: Record<Lang, Record<string, string>> = {
  fr: {
    confirmed: 'Votre adresse e-mail est confirmée.',
    checking: 'Confirmation de votre adresse…',
    prompt: 'Confirmez votre adresse e-mail pour activer votre compte.',
    resend: 'Renvoyer le lien',
    sending: 'Envoi…',
    sent: 'Lien envoyé. Vérifiez votre boîte de réception.',
    sendFailed: "Le lien n'a pas pu être envoyé. Réessayez dans un moment.",
    close: 'Fermer',
  },
  ar: {
    confirmed: 'تم تأكيد بريدك الإلكتروني.',
    checking: 'جارٍ تأكيد بريدك…',
    prompt: 'أكّد بريدك الإلكتروني لتنشيط حسابك.',
    resend: 'إعادة إرسال الرابط',
    sending: 'جارٍ الإرسال…',
    sent: 'تم إرسال الرابط. تحقّق من بريدك.',
    sendFailed: 'تعذّر إرسال الرابط. حاول مرة أخرى بعد قليل.',
    close: 'إغلاق',
  },
};

/** Takes the token out of the address bar without adding a history entry. */
const stripToken = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('verifier');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
};

const card =
  'fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] w-[min(32rem,calc(100vw-2rem))] ' +
  'rounded-2xl shadow-2xl border px-5 py-4 flex items-start gap-3 text-sm';

const EmailConfirmation: React.FC<Props> = ({ language, unverified, onConfirmed }) => {
  const t = LABELS[language] ?? LABELS.fr;

  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // The token is spent exactly once. Without this guard React's development
  // double-invoke would spend it, then report the second attempt as invalid.
  const spent = useRef(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verifier');
    if (!token || spent.current) return;
    spent.current = true;

    setState('checking');
    // Taken out of the bar immediately: a reload or a shared screenshot should
    // not carry a credential, even a spent one.
    stripToken();

    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setState('done');
        setMessage(t.confirmed);
        onConfirmed?.();
      })
      .catch((err) => {
        setState('error');
        setMessage(err?.response?.data?.message ?? t.sendFailed);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await api.post('/auth/resend-verification');
      setMessage(t.sent);
    } catch {
      setMessage(t.sendFailed);
    } finally {
      setSending(false);
    }
  };

  if (state === 'checking') {
    return (
      <div className={`${card} bg-white border-[#173E7D]/15 text-[#2B3442]`}>
        <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-[#173E7D]" />
        <span className="font-bold">{t.checking}</span>
      </div>
    );
  }

  // The outcome of a click takes precedence over the reminder: someone who has
  // just confirmed should not be told in the same breath to confirm.
  if (state === 'done' || state === 'error') {
    const ok = state === 'done';
    return (
      <div
        className={`${card} ${
          ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}
      >
        {ok ? (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
        ) : (
          <Mail size={18} className="mt-0.5 shrink-0" />
        )}
        <span className="font-bold flex-1 min-w-0">{message}</span>
        <button
          onClick={() => setState('idle')}
          aria-label={t.close}
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (!unverified || dismissed) return null;

  return (
    <div className={`${card} bg-white border-amber-200 text-[#2B3442]`}>
      <Mail size={18} className="mt-0.5 shrink-0 text-amber-500" />
      <div className="flex-1 min-w-0">
        <p className="font-bold">{t.prompt}</p>
        {message ? (
          <p className="mt-1 text-[13px] text-[#2B3442]/70">{message}</p>
        ) : (
          <button
            onClick={resend}
            disabled={sending}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-black text-[#173E7D] hover:underline disabled:opacity-50"
          >
            {sending && <Loader2 size={13} className="animate-spin" />}
            {sending ? t.sending : t.resend}
          </button>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t.close}
        className="shrink-0 opacity-50 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default EmailConfirmation;
