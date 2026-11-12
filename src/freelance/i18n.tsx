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
  "nav.pricingShort": "Tarifs",
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
  "footer.oneAccount": "Un seul compte pour l'emploi et le freelance, sur darlemploi.dz.",
  "footer.platform": "Plateforme",
  "footer.jobs": "Offres d'emploi",
  "footer.postCv": "Déposer un CV",

  "mode.freelance": "Mode freelance",
  "mode.client": "Mode client",
  "ws.credits": "crédits",
  "ws.hello": "Bonjour",
  "ws.balance": "Solde de crédits",
  "ws.topUp": "Recharger",
  "ws.lowBalance": "solde insuffisant pour publier",
  "ws.live": "En ligne",
  "ws.inModeration": "En modération",
  "ws.drafts": "Brouillons",
  "ws.expired": "Expirés",
  "ws.proposalsSent": "Propositions",
  "ws.ordersActive": "Commandes en cours",
  "ws.ordersDone": "Commandes terminées",
  "ws.portfolioOff": "Votre mini portfolio n'est pas encore publié",
  "ws.portfolioOffLede":
    "Une page personnelle à partager sur les réseaux et dans votre CV, à l'adresse",
  "ws.portfolioSetUp": "Préparer mon portfolio",
  "ws.colService": "Service",
  "ws.colStatus": "Statut",
  "ws.colViews": "Vues",
  "ws.colExpires": "Expire",
  "ws.colActions": "Actions",

  "client.free": "Gratuit pour les clients",
  "client.lede":
    "Décrivez votre besoin en quelques minutes et recevez des propositions de freelances. Publier un projet est gratuit.",
  "client.publishProject": "Publier un projet",
  "client.myProjects": "Mes projets",
  "client.proposalsIn": "Propositions reçues",

  "nav.home": "Accueil",

  "service.sponsored": "Sponsorisé",
  "service.verified": "Identité vérifiée",
  "service.about": "À propos de ce service",
  "service.reviews": "Avis clients",
  "service.reviewsShort": "avis",
  "service.faq": "Questions fréquentes",
  "service.needsFromYou": "Ce que le freelance aura besoin de vous",
  "service.optional": "facultatif",
  "service.plans": "Formules",
  "service.days": "jours",
  "service.revisions": "révisions",
  "service.options": "Options",
  "service.total": "Total",
  "service.order": "Commander",
  "service.contact": "Contacter le freelance",
  "service.paymentNote": "Le paiement se règle directement avec le freelance.",
  "service.orders": "commandes",
  "service.languages": "langues",
  "service.viewPortfolio": "Voir le portfolio",

  "project.proposals": "propositions",

  "portfolio.poweredBy": "Propulsé par",
  "portfolio.available": "Disponible",
  "portfolio.perHour": "/ heure",
  "portfolio.contactMe": "Me contacter",
  "portfolio.myServices": "Voir mes services",
  "portfolio.share": "Partager",
  "portfolio.copied": "Lien copié",
  "portfolio.about": "À propos",
  "portfolio.work": "Réalisations",
  "portfolio.projects": "projets",
  "portfolio.featured": "À la une",
  "portfolio.visit": "Voir",
  "portfolio.video": "Vidéo",
  "portfolio.services": "Services proposés",
  "portfolio.client": "Client",
  "portfolio.workTogether": "Un projet en tête ?",
  "portfolio.workTogetherLede":
    "Envoyez un message via Dar L'emploi : les échanges et la commande restent sur la plateforme.",
  "portfolio.hireMe": "Me recruter",

  "pricing.eyebrow": "Tarifs freelances",
  "pricing.title": "Payez seulement pour publier. Vos clients, eux, ne paient rien.",
  "pricing.lede":
    "Achetez des crédits pour publier vos services et répondre aux projets. Pas d'abonnement obligatoire.",
  "pricing.mode": "Mode de paiement",
  "pricing.packs": "Packs de crédits",
  "pricing.subscription": "Abonnement mensuel",
  "pricing.none": "Aucune offre disponible pour le moment.",
  "pricing.mostChosen": "Le plus choisi",
  "pricing.buy": "Acheter",
  "pricing.subscribe": "S'abonner",
  "pricing.start": "Commencer",
  "pricing.perMonth": "/ mois",
  "pricing.unlimited": "Illimité",
  "pricing.liveServices": "services en ligne",
  "pricing.proposalsInCredits": "Propositions payées en crédits",
  "pricing.proposalsMonthly": "propositions / mois",
  "pricing.priority": "Priorité dans la recherche",
  "pricing.boosts": "Boosts",
  "pricing.boostsWeekly": "boost / semaine",
  "pricing.customAddress": "Adresse personnalisée",
  "pricing.costTitle": "Ce que coûte chaque action",
  "pricing.costHint": "Barème modifiable dans le back-office",
  "pricing.colAction": "Action",
  "pricing.colCredits": "Crédits",
  "pricing.colDuration": "Durée",
  "pricing.rowPublish": "Publier un service",
  "pricing.rowPublishNote": "Visible dans la recherche et les catégories",
  "pricing.rowProposal": "Envoyer une proposition",
  "pricing.rowProposalNote": "Répondre à un projet publié par un client",
  "pricing.rowRenew": "Renouveler une publication",
  "pricing.rowRenewNote": "Prolonger un service expiré",
  "pricing.rowTrial": "Vos premières publications",
  "pricing.rowTrialNote": "Services et propositions offerts à l'inscription",
  "pricing.payTitle": "Paiement local et sécurisé",
  "pricing.payLede":
    "Rechargez votre portefeuille par carte CIB ou EDAHABIA. Les crédits sont ajoutés dès que le paiement est confirmé.",
  "pricing.buyCredits": "Acheter des crédits",
  "pricing.q1": "Que se passe-t-il si mon service est refusé ?",
  "pricing.a1":
    "Les crédits sont restitués sur votre portefeuille si la modération refuse la publication.",
  "pricing.q2": "Puis-je utiliser mon compte Dar L'emploi ?",
  "pricing.a2": "Oui, un seul compte donne accès à l'emploi et au freelance.",
  "pricing.q3": "Les clients paient-ils quelque chose ?",
  "pricing.a3":
    "Non. Publier un projet, recevoir des propositions et échanger par messagerie sont gratuits pour les clients.",

  "home.eyebrow": "La plateforme freelance de Dar L'emploi",
  "home.heroTitle": "Trouvez le bon freelance",
  "home.heroAccent": "en Algérie",
  "home.heroLede":
    "Développeurs, designers, traducteurs, monteurs… Comparez les services, publiez votre projet gratuitement et travaillez avec des talents de toutes les wilayas.",
  "home.searchLabel": "Rechercher un service",
  "home.allWilayas": "Toutes les wilayas",
  "home.remote": "À distance",
  "home.wilaya": "Wilaya",
  "home.popular": "Populaire :",
  "home.exploreCategories": "Explorer par catégorie",
  "home.allCategories": "Toutes les catégories",
  "home.featured": "Services mis en avant",
  "home.featuredLede": "Les offres boostées apparaissent ici, signalées comme « Sponsorisé ».",
  "home.allServices": "Voir tous les services",
  "home.allProjects": "Voir tous les projets",
  "home.youAreClient": "Vous êtes client",
  "home.youAreFreelancer": "Vous êtes freelance",
  "home.clientFree": "100 % gratuit",
  "home.freelancePaid": "Payez pour publier",
  "home.client1": "Publiez votre projet",
  "home.client1rest": " ou parcourez les services existants.",
  "home.client2": "Recevez des propositions",
  "home.client2rest": " de freelances vérifiés et comparez-les.",
  "home.client3": "Échangez par messagerie",
  "home.client3rest": ", commandez et laissez un avis.",
  "home.freelancer1": "Activez l'espace freelance",
  "home.freelancer1rest": " avec votre compte Dar L'emploi.",
  "home.freelancer2": "Achetez des crédits",
  "home.freelancer2rest": " et publiez vos services ou propositions.",
  "home.freelancer3": "Boostez vos offres",
  "home.freelancer3rest": " et partagez votre mini portfolio.",
  "home.ctaFree": "Publier un projet gratuitement",
  "home.seePricing": "Voir les tarifs",
  "home.bandTitle": "Votre talent mérite une vitrine",
  "home.bandLede":
    "Publiez votre premier service et obtenez votre page portfolio partageable.",
  "home.becomeFreelancer": "Devenir freelance",
  "home.servicesCount": "services",
};

const ar: Dict = {
  "brand.freelance": "العمل الحر",
  "nav.categories": "الفئات",
  "nav.projects": "المشاريع",
  "nav.freelancers": "المستقلون",
  "nav.pricing": "الأسعار والأرصدة",
  "nav.pricingShort": "الأسعار",
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
  "footer.oneAccount": "حساب واحد للتوظيف والعمل الحر، على darlemploi.dz.",
  "footer.platform": "المنصة",
  "footer.jobs": "عروض العمل",
  "footer.postCv": "إرسال السيرة الذاتية",

  "mode.freelance": "وضع المستقل",
  "mode.client": "وضع العميل",
  "ws.credits": "رصيد",
  "ws.hello": "مرحبًا",
  "ws.balance": "رصيد الحساب",
  "ws.topUp": "اشحن",
  "ws.lowBalance": "الرصيد لا يكفي للنشر",
  "ws.live": "منشورة",
  "ws.inModeration": "قيد المراجعة",
  "ws.drafts": "مسودات",
  "ws.expired": "منتهية",
  "ws.proposalsSent": "العروض المرسلة",
  "ws.ordersActive": "طلبات جارية",
  "ws.ordersDone": "طلبات منتهية",
  "ws.portfolioOff": "صفحة أعمالك غير منشورة بعد",
  "ws.portfolioOffLede": "صفحة شخصية تشاركها على الشبكات وفي سيرتك، على العنوان",
  "ws.portfolioSetUp": "تحضير صفحتي",
  "ws.colService": "الخدمة",
  "ws.colStatus": "الحالة",
  "ws.colViews": "المشاهدات",
  "ws.colExpires": "تنتهي",
  "ws.colActions": "إجراءات",

  "client.free": "مجاني للعملاء",
  "client.lede":
    "اشرح حاجتك في دقائق واستلم عروضًا من المستقلين. نشر المشروع مجاني.",
  "client.publishProject": "انشر مشروعًا",
  "client.myProjects": "مشاريعي",
  "client.proposalsIn": "العروض المستلمة",

  "nav.home": "الرئيسية",

  "service.sponsored": "برعاية",
  "service.verified": "هوية موثّقة",
  "service.about": "عن هذه الخدمة",
  "service.reviews": "تقييمات العملاء",
  "service.reviewsShort": "تقييم",
  "service.faq": "أسئلة متكررة",
  "service.needsFromYou": "ما يحتاجه المستقل منك",
  "service.optional": "اختياري",
  "service.plans": "الصيغ",
  "service.days": "أيام",
  "service.revisions": "تعديلات",
  "service.options": "خيارات إضافية",
  "service.total": "المجموع",
  "service.order": "اطلب الخدمة",
  "service.contact": "تواصل مع المستقل",
  "service.paymentNote": "يتم الدفع مباشرة مع المستقل.",
  "service.orders": "طلبات",
  "service.languages": "لغات",
  "service.viewPortfolio": "عرض الأعمال",

  "project.proposals": "عروض",

  "portfolio.poweredBy": "مدعوم بـ",
  "portfolio.available": "متاح",
  "portfolio.perHour": "/ ساعة",
  "portfolio.contactMe": "تواصل معي",
  "portfolio.myServices": "عرض خدماتي",
  "portfolio.share": "مشاركة",
  "portfolio.copied": "تم نسخ الرابط",
  "portfolio.about": "نبذة",
  "portfolio.work": "الأعمال",
  "portfolio.projects": "مشاريع",
  "portfolio.featured": "مميّز",
  "portfolio.visit": "زيارة",
  "portfolio.video": "فيديو",
  "portfolio.services": "الخدمات المقترحة",
  "portfolio.client": "عميل",
  "portfolio.workTogether": "لديك مشروع؟",
  "portfolio.workTogetherLede":
    "أرسل رسالة عبر دار التشغيل: تبقى المحادثات والطلب داخل المنصة.",
  "portfolio.hireMe": "وظّفني",

  "pricing.eyebrow": "أسعار المستقلين",
  "pricing.title": "ادفع للنشر فقط. أما عملاؤك فلا يدفعون شيئًا.",
  "pricing.lede": "اشترِ رصيدًا لنشر خدماتك والرد على المشاريع. لا اشتراك إلزامي.",
  "pricing.mode": "طريقة الدفع",
  "pricing.packs": "حِزم الرصيد",
  "pricing.subscription": "اشتراك شهري",
  "pricing.none": "لا توجد عروض متاحة حاليًا.",
  "pricing.mostChosen": "الأكثر اختيارًا",
  "pricing.buy": "اشترِ",
  "pricing.subscribe": "اشترك",
  "pricing.start": "ابدأ",
  "pricing.perMonth": "/ شهر",
  "pricing.unlimited": "غير محدود",
  "pricing.liveServices": "خدمات منشورة",
  "pricing.proposalsInCredits": "العروض مدفوعة بالرصيد",
  "pricing.proposalsMonthly": "عرض / شهر",
  "pricing.priority": "أولوية في البحث",
  "pricing.boosts": "التعزيز",
  "pricing.boostsWeekly": "تعزيز / أسبوع",
  "pricing.customAddress": "عنوان مخصّص",
  "pricing.costTitle": "تكلفة كل إجراء",
  "pricing.costHint": "الأسعار قابلة للتعديل من لوحة الإدارة",
  "pricing.colAction": "الإجراء",
  "pricing.colCredits": "الرصيد",
  "pricing.colDuration": "المدة",
  "pricing.rowPublish": "نشر خدمة",
  "pricing.rowPublishNote": "تظهر في البحث والفئات",
  "pricing.rowProposal": "إرسال عرض",
  "pricing.rowProposalNote": "الرد على مشروع نشره عميل",
  "pricing.rowRenew": "تجديد النشر",
  "pricing.rowRenewNote": "تمديد خدمة منتهية",
  "pricing.rowTrial": "منشوراتك الأولى",
  "pricing.rowTrialNote": "خدمات وعروض مجانية عند التسجيل",
  "pricing.payTitle": "دفع محلي وآمن",
  "pricing.payLede":
    "اشحن محفظتك ببطاقة CIB أو EDAHABIA. يُضاف الرصيد بمجرد تأكيد الدفع.",
  "pricing.buyCredits": "اشترِ رصيدًا",
  "pricing.q1": "ماذا يحدث إذا رُفضت خدمتي؟",
  "pricing.a1": "يُعاد الرصيد إلى محفظتك إذا رفضت الإدارة النشر.",
  "pricing.q2": "هل أستطيع استخدام حسابي في دار التشغيل؟",
  "pricing.a2": "نعم، حساب واحد يتيح الوصول إلى التوظيف والعمل الحر.",
  "pricing.q3": "هل يدفع العملاء أي شيء؟",
  "pricing.a3": "لا. نشر مشروع واستلام العروض والمراسلة كلها مجانية للعملاء.",

  "home.eyebrow": "منصة العمل الحر من دار التشغيل",
  "home.heroTitle": "اعثر على المستقل المناسب",
  "home.heroAccent": "في الجزائر",
  "home.heroLede":
    "مطورون، مصممون، مترجمون، مونتاج… قارن بين الخدمات، انشر مشروعك مجانًا واعمل مع كفاءات من كل الولايات.",
  "home.searchLabel": "ابحث عن خدمة",
  "home.allWilayas": "كل الولايات",
  "home.remote": "عن بعد",
  "home.wilaya": "الولاية",
  "home.popular": "الأكثر طلبًا:",
  "home.exploreCategories": "استكشف حسب الفئة",
  "home.allCategories": "كل الفئات",
  "home.featured": "خدمات مميزة",
  "home.featuredLede": "تظهر هنا العروض المعزَّزة، مع إشارة «برعاية».",
  "home.allServices": "عرض كل الخدمات",
  "home.allProjects": "عرض كل المشاريع",
  "home.youAreClient": "أنت عميل",
  "home.youAreFreelancer": "أنت مستقل",
  "home.clientFree": "مجاني 100 ٪",
  "home.freelancePaid": "ادفع للنشر",
  "home.client1": "انشر مشروعك",
  "home.client1rest": " أو تصفّح الخدمات المتوفرة.",
  "home.client2": "استلم العروض",
  "home.client2rest": " من مستقلين موثّقين وقارن بينها.",
  "home.client3": "تواصل بالرسائل",
  "home.client3rest": "، اطلب الخدمة واترك تقييمًا.",
  "home.freelancer1": "فعّل مساحة العمل الحر",
  "home.freelancer1rest": " بحسابك في دار التشغيل.",
  "home.freelancer2": "اشترِ رصيدًا",
  "home.freelancer2rest": " وانشر خدماتك أو عروضك.",
  "home.freelancer3": "عزّز عروضك",
  "home.freelancer3rest": " وشارك صفحتك الشخصية.",
  "home.ctaFree": "انشر مشروعًا مجانًا",
  "home.seePricing": "عرض الأسعار",
  "home.bandTitle": "موهبتك تستحق واجهة",
  "home.bandLede": "انشر خدمتك الأولى واحصل على صفحة أعمال قابلة للمشاركة.",
  "home.becomeFreelancer": "كن مستقلًا",
  "home.servicesCount": "خدمة",
};

const en: Dict = {
  "brand.freelance": "Freelance",
  "nav.categories": "Categories",
  "nav.projects": "Projects",
  "nav.freelancers": "Freelancers",
  "nav.pricing": "Pricing and credits",
  "nav.pricingShort": "Pricing",
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
  "footer.oneAccount": "One account for jobs and freelancing, on darlemploi.dz.",
  "footer.platform": "Platform",
  "footer.jobs": "Job offers",
  "footer.postCv": "Post a CV",

  "mode.freelance": "Freelance mode",
  "mode.client": "Client mode",
  "ws.credits": "credits",
  "ws.hello": "Hello",
  "ws.balance": "Credit balance",
  "ws.topUp": "Top up",
  "ws.lowBalance": "not enough credits to publish",
  "ws.live": "Live",
  "ws.inModeration": "In moderation",
  "ws.drafts": "Drafts",
  "ws.expired": "Expired",
  "ws.proposalsSent": "Proposals",
  "ws.ordersActive": "Orders in progress",
  "ws.ordersDone": "Orders completed",
  "ws.portfolioOff": "Your mini portfolio is not published yet",
  "ws.portfolioOffLede": "A personal page to share on social media and on your CV, at",
  "ws.portfolioSetUp": "Set up my portfolio",
  "ws.colService": "Service",
  "ws.colStatus": "Status",
  "ws.colViews": "Views",
  "ws.colExpires": "Expires",
  "ws.colActions": "Actions",

  "client.free": "Free for clients",
  "client.lede":
    "Describe what you need in a few minutes and receive proposals from freelancers. Posting a project is free.",
  "client.publishProject": "Post a project",
  "client.myProjects": "My projects",
  "client.proposalsIn": "Proposals received",

  "nav.home": "Home",

  "service.sponsored": "Sponsored",
  "service.verified": "Identity verified",
  "service.about": "About this service",
  "service.reviews": "Client reviews",
  "service.reviewsShort": "reviews",
  "service.faq": "Frequently asked",
  "service.needsFromYou": "What the freelancer will need from you",
  "service.optional": "optional",
  "service.plans": "Packages",
  "service.days": "days",
  "service.revisions": "revisions",
  "service.options": "Add-ons",
  "service.total": "Total",
  "service.order": "Order",
  "service.contact": "Message the freelancer",
  "service.paymentNote": "Payment is settled directly with the freelancer.",
  "service.orders": "orders",
  "service.languages": "languages",
  "service.viewPortfolio": "View portfolio",

  "project.proposals": "proposals",

  "portfolio.poweredBy": "Powered by",
  "portfolio.available": "Available",
  "portfolio.perHour": "/ hour",
  "portfolio.contactMe": "Get in touch",
  "portfolio.myServices": "See my services",
  "portfolio.share": "Share",
  "portfolio.copied": "Link copied",
  "portfolio.about": "About",
  "portfolio.work": "Selected work",
  "portfolio.projects": "projects",
  "portfolio.featured": "Featured",
  "portfolio.visit": "Visit",
  "portfolio.video": "Video",
  "portfolio.services": "Services offered",
  "portfolio.client": "Client",
  "portfolio.workTogether": "Got a project?",
  "portfolio.workTogetherLede":
    "Send a message through Dar L'emploi: the conversation and the order stay on the platform.",
  "portfolio.hireMe": "Hire me",

  "pricing.eyebrow": "Freelancer pricing",
  "pricing.title": "You pay to publish. Your clients pay nothing.",
  "pricing.lede":
    "Buy credits to publish services and answer projects. No subscription required.",
  "pricing.mode": "Payment mode",
  "pricing.packs": "Credit packs",
  "pricing.subscription": "Monthly plan",
  "pricing.none": "No offer available at the moment.",
  "pricing.mostChosen": "Most chosen",
  "pricing.buy": "Buy",
  "pricing.subscribe": "Subscribe",
  "pricing.start": "Get started",
  "pricing.perMonth": "/ month",
  "pricing.unlimited": "Unlimited",
  "pricing.liveServices": "services live",
  "pricing.proposalsInCredits": "Proposals paid in credits",
  "pricing.proposalsMonthly": "proposals / month",
  "pricing.priority": "Priority in search",
  "pricing.boosts": "Boosts",
  "pricing.boostsWeekly": "boost / week",
  "pricing.customAddress": "Custom address",
  "pricing.costTitle": "What each action costs",
  "pricing.costHint": "Rates are editable in the back office",
  "pricing.colAction": "Action",
  "pricing.colCredits": "Credits",
  "pricing.colDuration": "Duration",
  "pricing.rowPublish": "Publish a service",
  "pricing.rowPublishNote": "Listed in search and in its category",
  "pricing.rowProposal": "Send a proposal",
  "pricing.rowProposalNote": "Answer a project posted by a client",
  "pricing.rowRenew": "Renew a listing",
  "pricing.rowRenewNote": "Extend an expired service",
  "pricing.rowTrial": "Your first listings",
  "pricing.rowTrialNote": "Services and proposals included on sign-up",
  "pricing.payTitle": "Local, secure payment",
  "pricing.payLede":
    "Top up your wallet by CIB or EDAHABIA card. Credits are added as soon as the payment is confirmed.",
  "pricing.buyCredits": "Buy credits",
  "pricing.q1": "What happens if my service is rejected?",
  "pricing.a1": "The credits go back to your wallet if moderation rejects the listing.",
  "pricing.q2": "Can I use my Dar L'emploi account?",
  "pricing.a2": "Yes — one account covers both jobs and freelancing.",
  "pricing.q3": "Do clients pay anything?",
  "pricing.a3":
    "No. Posting a project, receiving proposals and messaging are all free for clients.",

  "home.eyebrow": "The Dar L'emploi freelance platform",
  "home.heroTitle": "Find the right freelancer",
  "home.heroAccent": "in Algeria",
  "home.heroLede":
    "Developers, designers, translators, video editors… Compare services, post your project for free and work with talent from every wilaya.",
  "home.searchLabel": "Search for a service",
  "home.allWilayas": "All wilayas",
  "home.remote": "Remote",
  "home.wilaya": "Wilaya",
  "home.popular": "Popular:",
  "home.exploreCategories": "Browse by category",
  "home.allCategories": "All categories",
  "home.featured": "Featured services",
  "home.featuredLede": "Boosted listings appear here, marked as “Sponsored”.",
  "home.allServices": "See all services",
  "home.allProjects": "See all projects",
  "home.youAreClient": "You are a client",
  "home.youAreFreelancer": "You are a freelancer",
  "home.clientFree": "100% free",
  "home.freelancePaid": "Pay to publish",
  "home.client1": "Post your project",
  "home.client1rest": " or browse the services already listed.",
  "home.client2": "Receive proposals",
  "home.client2rest": " from verified freelancers and compare them.",
  "home.client3": "Talk by message",
  "home.client3rest": ", order, and leave a review.",
  "home.freelancer1": "Activate the freelance space",
  "home.freelancer1rest": " with your Dar L'emploi account.",
  "home.freelancer2": "Buy credits",
  "home.freelancer2rest": " and publish your services or proposals.",
  "home.freelancer3": "Boost your listings",
  "home.freelancer3rest": " and share your mini portfolio.",
  "home.ctaFree": "Post a project for free",
  "home.seePricing": "See pricing",
  "home.bandTitle": "Your talent deserves a shopfront",
  "home.bandLede": "Publish your first service and get a portfolio page you can share.",
  "home.becomeFreelancer": "Become a freelancer",
  "home.servicesCount": "services",
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
