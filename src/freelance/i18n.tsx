import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Language and direction for the marketplace.
 *
 * Arabic first, French second, English on portfolios — the order the
 * specification sets. Arabic is a real RTL layout, not translated labels in a
 * left-to-right page, so `dir` is set on <html> and every layout reads it
 * from there rather than each component deciding for itself.
 *
 * Translations are keys, not scattered `language === 'ar' ? … : …`
 * conditions. The recruitment app does it the other way and it is why adding
 * a language there means auditing thousands of lines.
 */

export type Lang = "fr" | "ar" | "en";

const STORAGE_KEY = "dl-freelance-lang";

export const RTL_LANGS: Lang[] = ["ar"];

type Dict = Record<string, string>;

const fr: Dict = {
  "brand.freelance": "Freelance",
  "nav.categories": "Catégories",
  "nav.projects": "Projets",
  "nav.freelancers": "Freelances",
  "nav.pricing": "Tarifs et crédits",
  "nav.messages": "Messages",
  "nav.signin": "Connexion",
  "nav.signup": "Inscription",
  "nav.dashboard": "Mon espace",
  "nav.backToJobs": "Retour à l'emploi",

  "home.title": "Trouvez le bon freelance. Proposez votre expertise.",
  "home.subtitle":
    "La marketplace algérienne qui relie les freelances aux entreprises et aux particuliers.",
  "home.searchPlaceholder": "Quel service cherchez-vous ?",
  "home.search": "Rechercher",
  "home.categories": "Catégories",
  "home.popularServices": "Services populaires",
  "home.featuredProjects": "Projets à la une",
  "home.recommendedFreelancers": "Freelances recommandés",
  "home.howItWorks": "Comment ça marche",
  "home.forClients": "Pour les clients",
  "home.forFreelancers": "Pour les freelances",
  "home.ctaPublishService": "Publier un service",
  "home.ctaPostProject": "Publier un projet",

  "empty.services": "Aucun service publié pour le moment.",
  "empty.projects": "Aucun projet publié pour le moment.",
  "empty.freelancers": "Aucun freelance inscrit pour le moment.",
  "empty.categories": "Aucune catégorie disponible.",
  "empty.hint": "Cette section se remplira dès les premières publications.",

  "msg.title": "Messages",
  "msg.threads": "Conversations",
  "msg.empty": "Aucune conversation pour le moment.",
  "msg.emptyHint": "Écrivez à un freelance depuis sa page, ou répondez à un projet.",
  "msg.pick": "Choisissez une conversation.",
  "msg.noMessages": "Aucun message. Écrivez le premier.",
  "msg.placeholder": "Votre message…",
  "msg.send": "Envoyer",
  "msg.contact": "Contacter",
  "msg.contactClient": "Contacter le client",
  "msg.aboutOrder": "À propos de la commande",
  "msg.you": "Vous",
  "msg.flagged":
    "Ce message semble contenir un contact direct. Il est transmis, mais signalé : les échanges doivent rester sur la plateforme.",
  "msg.offPlatform":
    "Restez sur la plateforme : un accord conclu ailleurs ne laisse aucune trace en cas de litige.",
  "msg.signInToWrite": "Connectez-vous pour écrire.",

  "common.loading": "Chargement…",
  "common.error": "Une erreur est survenue.",
  "common.retry": "Réessayer",
  "common.seeAll": "Tout voir",
  "common.from": "À partir de",
  "common.free": "Gratuit",

  "footer.about": "À propos",
  "footer.help": "Centre d'aide",
  "footer.terms": "Conditions d'utilisation",
  "footer.privacy": "Confidentialité",
  "footer.cookies": "Cookies",
  "footer.rights": "Tous droits réservés.",
};

const ar: Dict = {
  "brand.freelance": "العمل الحر",
  "nav.categories": "الفئات",
  "nav.projects": "المشاريع",
  "nav.freelancers": "المستقلون",
  "nav.pricing": "الأسعار والأرصدة",
  "nav.messages": "الرسائل",
  "nav.signin": "تسجيل الدخول",
  "nav.signup": "إنشاء حساب",
  "nav.dashboard": "مساحتي",
  "nav.backToJobs": "العودة إلى التوظيف",

  "home.title": "اعثر على المستقل المناسب. اعرض خبرتك.",
  "home.subtitle": "المنصة الجزائرية التي تربط المستقلين بالشركات والأفراد.",
  "home.searchPlaceholder": "ما الخدمة التي تبحث عنها؟",
  "home.search": "بحث",
  "home.categories": "الفئات",
  "home.popularServices": "الخدمات الأكثر طلبًا",
  "home.featuredProjects": "مشاريع مميزة",
  "home.recommendedFreelancers": "مستقلون موصى بهم",
  "home.howItWorks": "كيف تعمل المنصة",
  "home.forClients": "للعملاء",
  "home.forFreelancers": "للمستقلين",
  "home.ctaPublishService": "انشر خدمة",
  "home.ctaPostProject": "انشر مشروعًا",

  "empty.services": "لا توجد خدمات منشورة حاليًا.",
  "empty.projects": "لا توجد مشاريع منشورة حاليًا.",
  "empty.freelancers": "لا يوجد مستقلون مسجلون حاليًا.",
  "empty.categories": "لا توجد فئات متاحة.",
  "empty.hint": "سيمتلئ هذا القسم مع أول المنشورات.",

  "msg.title": "الرسائل",
  "msg.threads": "المحادثات",
  "msg.empty": "لا توجد محادثات حاليًا.",
  "msg.emptyHint": "اكتب إلى مستقل من صفحته، أو قدّم عرضًا على مشروع.",
  "msg.pick": "اختر محادثة.",
  "msg.noMessages": "لا توجد رسائل. اكتب الأولى.",
  "msg.placeholder": "رسالتك…",
  "msg.send": "إرسال",
  "msg.contact": "تواصل",
  "msg.contactClient": "تواصل مع العميل",
  "msg.aboutOrder": "بخصوص الطلب",
  "msg.you": "أنت",
  "msg.flagged":
    "تبدو هذه الرسالة وكأنها تحتوي على وسيلة اتصال مباشرة. تم إرسالها، لكن تمّ الإبلاغ عنها: يجب أن تبقى المحادثات على المنصة.",
  "msg.offPlatform":
    "ابقَ على المنصة: الاتفاق المُنجز خارجها لا يترك أي أثر عند وقوع خلاف.",
  "msg.signInToWrite": "سجّل الدخول للكتابة.",

  "common.loading": "جارٍ التحميل…",
  "common.error": "حدث خطأ.",
  "common.retry": "إعادة المحاولة",
  "common.seeAll": "عرض الكل",
  "common.from": "ابتداءً من",
  "common.free": "مجاني",

  "footer.about": "من نحن",
  "footer.help": "مركز المساعدة",
  "footer.terms": "شروط الاستخدام",
  "footer.privacy": "الخصوصية",
  "footer.cookies": "ملفات تعريف الارتباط",
  "footer.rights": "جميع الحقوق محفوظة.",
};

const en: Dict = {
  "brand.freelance": "Freelance",
  "nav.categories": "Categories",
  "nav.projects": "Projects",
  "nav.freelancers": "Freelancers",
  "nav.pricing": "Pricing and credits",
  "nav.messages": "Messages",
  "nav.signin": "Sign in",
  "nav.signup": "Sign up",
  "nav.dashboard": "My workspace",
  "nav.backToJobs": "Back to jobs",

  "home.title": "Find the right freelancer. Offer your expertise.",
  "home.subtitle":
    "The Algerian marketplace connecting freelancers with companies and individuals.",
  "home.searchPlaceholder": "What service are you looking for?",
  "home.search": "Search",
  "home.categories": "Categories",
  "home.popularServices": "Popular services",
  "home.featuredProjects": "Featured projects",
  "home.recommendedFreelancers": "Recommended freelancers",
  "home.howItWorks": "How it works",
  "home.forClients": "For clients",
  "home.forFreelancers": "For freelancers",
  "home.ctaPublishService": "Publish a service",
  "home.ctaPostProject": "Post a project",

  "empty.services": "No services published yet.",
  "empty.projects": "No projects published yet.",
  "empty.freelancers": "No freelancers registered yet.",
  "empty.categories": "No categories available.",
  "empty.hint": "This section fills up with the first publications.",

  "msg.title": "Messages",
  "msg.threads": "Conversations",
  "msg.empty": "No conversations yet.",
  "msg.emptyHint": "Write to a freelancer from their page, or answer a project.",
  "msg.pick": "Pick a conversation.",
  "msg.noMessages": "No messages yet. Write the first one.",
  "msg.placeholder": "Your message…",
  "msg.send": "Send",
  "msg.contact": "Contact",
  "msg.contactClient": "Contact the client",
  "msg.aboutOrder": "About order",
  "msg.you": "You",
  "msg.flagged":
    "This message looks like it contains direct contact details. It has been delivered, but flagged: conversations must stay on the platform.",
  "msg.offPlatform":
    "Stay on the platform: a deal struck elsewhere leaves nothing to read if it goes wrong.",
  "msg.signInToWrite": "Sign in to write.",

  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "common.retry": "Retry",
  "common.seeAll": "See all",
  "common.from": "From",
  "common.free": "Free",

  "footer.about": "About",
  "footer.help": "Help centre",
  "footer.terms": "Terms of use",
  "footer.privacy": "Privacy",
  "footer.cookies": "Cookies",
  "footer.rights": "All rights reserved.",
};

const DICTS: Record<Lang, Dict> = { fr, ar, en };

interface I18nValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const readStoredLang = (): Lang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "ar" || stored === "en") return stored;
  } catch {
    // Private windows and blocked site data throw on read.
  }
  return "fr";
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const isRTL = RTL_LANGS.includes(lang);
  const dir = isRTL ? "rtl" : "ltr";

  // Set on <html> so the whole document flips, including scrollbars and any
  // portal rendered outside the React tree.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A preference that cannot be stored is still honoured this session.
    }
  };

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir,
      isRTL,
      setLang,
      // Falls back to French, then to the key itself, so a missing
      // translation shows something readable instead of blank.
      t: (key) => DICTS[lang][key] ?? fr[key] ?? key,
    }),
    [lang, dir, isRTL]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
};
