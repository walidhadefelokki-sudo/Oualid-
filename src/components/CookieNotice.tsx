import React, { useEffect, useRef, useState } from 'react';
import { Cookie, X } from 'lucide-react';

/**
 * Cookie notice and cookie policy, shared by the recruitment app and the
 * freelance marketplace.
 *
 * The site sets no analytics or advertising cookies — only what sign-in and a
 * couple of preferences need — so there is nothing optional to consent to and
 * the banner is informational: one acknowledgement, no "refuse" button that
 * would pretend to switch something off. If a tracker is ever added, this is
 * where a real choice has to appear before it loads.
 *
 * The policy describes what the code actually stores. When a cookie or
 * storage key is added or removed, update ITEMS below.
 */

type NoticeLang = 'fr' | 'ar' | 'en';

const SEEN_KEY = 'cookieNoticeSeen';
const OPEN_EVENT = 'dl:open-cookie-policy';

/** Opens the cookie policy from anywhere, e.g. a footer link. */
export const openCookiePolicy = () => window.dispatchEvent(new Event(OPEN_EVENT));

type Item = { name: string; kind: string; purpose: string; duration: string };

const TEXT: Record<
  NoticeLang,
  {
    banner: string;
    ok: string;
    more: string;
    title: string;
    close: string;
    intro: string;
    whatTitle: string;
    what: string;
    usedTitle: string;
    cols: [string, string, string, string];
    items: Item[];
    noTrackingTitle: string;
    noTracking: string;
    thirdTitle: string;
    third: string;
    controlTitle: string;
    control: string;
    contactTitle: string;
    contact: string;
  }
> = {
  fr: {
    banner:
      "Nous utilisons uniquement des cookies essentiels au fonctionnement du site (connexion, sécurité, préférence de langue). Aucun cookie publicitaire ni de mesure d'audience.",
    ok: "J'ai compris",
    more: 'En savoir plus',
    title: 'Politique de cookies',
    close: 'Fermer',
    intro: "Cette page explique ce que Dar L'emploi enregistre dans votre navigateur et pourquoi.",
    whatTitle: "Qu'est-ce qu'un cookie ?",
    what:
      "Un cookie est un petit fichier qu'un site enregistre dans votre navigateur. Nous utilisons aussi le stockage local (localStorage), qui fonctionne de la même manière. Les deux sont décrits ci-dessous.",
    usedTitle: 'Ce que nous utilisons',
    cols: ['Nom', 'Type', 'Finalité', 'Durée'],
    items: [
      { name: 'token', kind: 'Stockage local', purpose: 'Vous garder connecté à votre compte.', duration: "30 jours, ou jusqu'à la déconnexion" },
      { name: 'lastActivityAt', kind: 'Stockage local', purpose: "Vous déconnecter automatiquement après 15 minutes d'inactivité.", duration: "Jusqu'à la déconnexion" },
      { name: 'dl_oauth_state', kind: 'Cookie HttpOnly', purpose: 'Protéger la connexion avec Google contre la falsification.', duration: '10 minutes' },
      { name: 'dl_oauth_handoff', kind: 'Cookie HttpOnly', purpose: 'Transmettre la session de manière sécurisée après la connexion Google.', duration: '1 minute' },
      { name: 'dl-freelance-lang', kind: 'Stockage local', purpose: "Mémoriser votre langue sur l'espace Freelance.", duration: "Jusqu'à ce que vous la changiez" },
      { name: 'cookieNoticeSeen', kind: 'Stockage local', purpose: 'Ne plus afficher ce bandeau une fois lu.', duration: "Jusqu'à ce que vous l'effaciez" },
    ],
    noTrackingTitle: 'Pas de suivi',
    noTracking:
      "Nous n'utilisons aucun cookie publicitaire, de profilage ou de mesure d'audience, et nous ne vendons pas vos données. Tous les éléments ci-dessus sont nécessaires au fonctionnement du site.",
    thirdTitle: 'Services tiers',
    third:
      "Les polices de caractères sont chargées depuis Google Fonts, ce qui transmet votre adresse IP à Google. Si vous choisissez « Continuer avec Google », la connexion se déroule sur les pages de Google, selon ses propres règles.",
    controlTitle: 'Gérer les cookies',
    control:
      "Vous pouvez supprimer ou bloquer les cookies et le stockage local dans les réglages de votre navigateur. Vous serez alors déconnecté et certaines fonctions, comme la connexion, ne fonctionneront plus.",
    contactTitle: 'Contact',
    contact: 'Pour toute question : contact@darlemploi.dz',
  },
  ar: {
    banner:
      'نستخدم فقط ملفات تعريف الارتباط الضرورية لعمل الموقع (تسجيل الدخول، الأمان، تفضيل اللغة). لا نستخدم أي ملفات إعلانية أو لقياس الجمهور.',
    ok: 'فهمت',
    more: 'معرفة المزيد',
    title: 'سياسة ملفات تعريف الارتباط',
    close: 'إغلاق',
    intro: 'توضح هذه الصفحة ما يحفظه موقع دار التشغيل في متصفحك ولماذا.',
    whatTitle: 'ما هو ملف تعريف الارتباط؟',
    what:
      'ملف تعريف الارتباط (كوكي) هو ملف صغير يحفظه الموقع في متصفحك. نستخدم أيضاً التخزين المحلي (localStorage) الذي يعمل بالطريقة نفسها. كلاهما موضح أدناه.',
    usedTitle: 'ما نستخدمه',
    cols: ['الاسم', 'النوع', 'الغرض', 'المدة'],
    items: [
      { name: 'token', kind: 'تخزين محلي', purpose: 'إبقاؤك متصلاً بحسابك.', duration: '30 يوماً، أو حتى تسجيل الخروج' },
      { name: 'lastActivityAt', kind: 'تخزين محلي', purpose: 'تسجيل خروجك تلقائياً بعد 15 دقيقة من عدم النشاط.', duration: 'حتى تسجيل الخروج' },
      { name: 'dl_oauth_state', kind: 'كوكي HttpOnly', purpose: 'حماية تسجيل الدخول عبر Google من التزوير.', duration: '10 دقائق' },
      { name: 'dl_oauth_handoff', kind: 'كوكي HttpOnly', purpose: 'نقل الجلسة بأمان بعد تسجيل الدخول عبر Google.', duration: 'دقيقة واحدة' },
      { name: 'dl-freelance-lang', kind: 'تخزين محلي', purpose: 'تذكر لغتك في فضاء العمل الحر.', duration: 'حتى تغييرها' },
      { name: 'cookieNoticeSeen', kind: 'تخزين محلي', purpose: 'عدم إظهار هذا الشريط مرة أخرى بعد قراءته.', duration: 'حتى تحذفه' },
    ],
    noTrackingTitle: 'لا تتبع',
    noTracking:
      'لا نستخدم أي ملفات إعلانية أو للتنميط أو لقياس الجمهور، ولا نبيع بياناتك. كل العناصر أعلاه ضرورية لعمل الموقع.',
    thirdTitle: 'خدمات خارجية',
    third:
      'يتم تحميل الخطوط من Google Fonts، مما ينقل عنوان IP الخاص بك إلى Google. إذا اخترت «المتابعة باستخدام Google»، يتم تسجيل الدخول على صفحات Google وفق قواعدها الخاصة.',
    controlTitle: 'التحكم في ملفات تعريف الارتباط',
    control:
      'يمكنك حذف أو حظر ملفات تعريف الارتباط والتخزين المحلي من إعدادات متصفحك. سيتم حينها تسجيل خروجك ولن تعمل بعض الوظائف مثل تسجيل الدخول.',
    contactTitle: 'اتصل بنا',
    contact: 'لأي سؤال: contact@darlemploi.dz',
  },
  en: {
    banner:
      'We only use cookies that the site needs to work (sign-in, security, language preference). No advertising or analytics cookies.',
    ok: 'Got it',
    more: 'Learn more',
    title: 'Cookie policy',
    close: 'Close',
    intro: "This page explains what Dar L'emploi stores in your browser and why.",
    whatTitle: 'What is a cookie?',
    what:
      'A cookie is a small file a website saves in your browser. We also use local storage (localStorage), which works the same way. Both are listed below.',
    usedTitle: 'What we use',
    cols: ['Name', 'Type', 'Purpose', 'Duration'],
    items: [
      { name: 'token', kind: 'Local storage', purpose: 'Keeps you signed in to your account.', duration: '30 days, or until you sign out' },
      { name: 'lastActivityAt', kind: 'Local storage', purpose: 'Signs you out after 15 minutes of inactivity.', duration: 'Until you sign out' },
      { name: 'dl_oauth_state', kind: 'HttpOnly cookie', purpose: 'Protects Google sign-in against forgery.', duration: '10 minutes' },
      { name: 'dl_oauth_handoff', kind: 'HttpOnly cookie', purpose: 'Securely hands over your session after Google sign-in.', duration: '1 minute' },
      { name: 'dl-freelance-lang', kind: 'Local storage', purpose: 'Remembers your language on Freelance.', duration: 'Until you change it' },
      { name: 'cookieNoticeSeen', kind: 'Local storage', purpose: 'Stops showing this banner once read.', duration: 'Until you clear it' },
    ],
    noTrackingTitle: 'No tracking',
    noTracking:
      'We use no advertising, profiling or analytics cookies, and we do not sell your data. Everything above is needed for the site to work.',
    thirdTitle: 'Third-party services',
    third:
      'Fonts are loaded from Google Fonts, which shares your IP address with Google. If you choose "Continue with Google", sign-in happens on Google\'s pages under Google\'s own terms.',
    controlTitle: 'Managing cookies',
    control:
      'You can delete or block cookies and local storage in your browser settings. You will then be signed out, and features such as sign-in will stop working.',
    contactTitle: 'Contact',
    contact: 'Questions: contact@darlemploi.dz',
  },
};

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false; // blocked storage — show the notice, it simply won't stick
  }
};

const CookieNotice: React.FC<{ language: NoticeLang }> = ({ language }) => {
  const [showBanner, setShowBanner] = useState(() => !readSeen());
  const [policyOpen, setPolicyOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const tx = TEXT[language] ?? TEXT.fr;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const open = () => setPolicyOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!policyOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPolicyOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [policyOpen]);

  const acknowledge = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Hidden for this visit even if it cannot be remembered.
    }
  };

  return (
    <>
      {showBanner && !policyOpen && (
        <div
          role="region"
          aria-label={tx.title}
          dir={dir}
          className="fixed inset-x-4 bottom-4 z-[150] mx-auto max-w-3xl rounded-2xl bg-[#0B1E3D] text-white shadow-2xl border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <Cookie size={28} className="text-[#F68D58] shrink-0 hidden sm:block" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-white/80 flex-1">{tx.banner}</p>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setPolicyOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
            >
              {tx.more}
            </button>
            <button
              type="button"
              onClick={acknowledge}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-[#F68D58] text-white hover:bg-[#e57a45] transition-colors"
            >
              {tx.ok}
            </button>
          </div>
        </div>
      )}

      {policyOpen && (
        <div
          className="fixed inset-0 z-[160] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPolicyOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-policy-title"
            dir={dir}
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-gray-700 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 id="cookie-policy-title" className="text-2xl font-black text-[#173E7D]">
                {tx.title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setPolicyOpen(false)}
                aria-label={tx.close}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm mb-6">{tx.intro}</p>

            <Section title={tx.whatTitle}>{tx.what}</Section>

            <h3 className="font-bold text-[#173E7D] mb-2">{tx.usedTitle}</h3>
            <div className="overflow-x-auto mb-6 rounded-xl border border-gray-100">
              <table className="w-full text-sm text-start">
                <thead className="bg-gray-50 text-[#173E7D]">
                  <tr>
                    {tx.cols.map((c) => (
                      <th key={c} className="px-3 py-2 font-bold text-start">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tx.items.map((it) => (
                    <tr key={it.name} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap" dir="ltr">
                        {it.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{it.kind}</td>
                      <td className="px-3 py-2 min-w-[12rem]">{it.purpose}</td>
                      <td className="px-3 py-2 min-w-[8rem]">{it.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Section title={tx.noTrackingTitle}>{tx.noTracking}</Section>
            <Section title={tx.thirdTitle}>{tx.third}</Section>
            <Section title={tx.controlTitle}>{tx.control}</Section>
            <Section title={tx.contactTitle}>{tx.contact}</Section>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  acknowledge();
                  setPolicyOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#173E7D] text-white hover:bg-[#0B1E3D] transition-colors"
              >
                {tx.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="font-bold text-[#173E7D] mb-1">{title}</h3>
    <p className="text-sm leading-relaxed">{children}</p>
  </div>
);

export default CookieNotice;
