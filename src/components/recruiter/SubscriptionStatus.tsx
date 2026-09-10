import { ReactNode, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CreditCard,
  Crown,
  FileText,
  Infinity as InfinityIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import companyService, {
  SubscriptionOverview,
  SubscriptionRecord,
} from '../../services/company.service';

interface Props {
  language: 'fr' | 'ar' | 'en';
  /** Opens the pack purchase flow. */
  onBuyPostings?: () => void;
}

const PLAN_LABEL: Record<string, { fr: string; ar: string }> = {
  FREE: { fr: 'Gratuit', ar: 'مجاني' },
  PREMIUM: { fr: 'Premium — à l’annonce', ar: 'بريميوم — بالإعلان' },
  CORPORATE: { fr: 'Corporate', ar: 'كوربوريت' },
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  EXPIRED: 'bg-red-50 text-red-500 border-red-100',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  PENDING: 'bg-amber-50 text-amber-600 border-amber-100',
};

/**
 * The recruiter's own subscription, at the top of the Abonnement page.
 *
 * Every figure here is a stored record — the plan on the company, the term on
 * its Subscription row, the offers and applications counted in the database.
 * Where nothing is recorded it says so instead of filling the gap: a company
 * on the default FREE plan has never had a Subscription created for it, so it
 * has no start date and no expiry, and this reports exactly that rather than
 * inventing a term for it.
 */
export default function SubscriptionStatus({ language, onBuyPostings }: Props) {
  const isRTL = language === 'ar';
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await companyService.getMySubscription());
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          t('Impossible de charger votre abonnement.', 'تعذر تحميل اشتراكك.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRTL ? 'ar-DZ' : 'fr-DZ', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const statusLabel = (s: string) =>
    ({
      ACTIVE: t('Actif', 'نشط'),
      EXPIRED: t('Expiré', 'منتهي'),
      CANCELLED: t('Annulé', 'ملغى'),
      PENDING: t('En attente', 'قيد الانتظار'),
    })[s] ?? s;

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="font-bold text-sm">
          {t('Chargement de votre abonnement…', 'جارٍ تحميل اشتراكك…')}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-red-100 shadow-sm p-8 flex flex-wrap items-center justify-between gap-4">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <AlertTriangle size={22} className="text-red-500 shrink-0" />
          <p className="font-bold text-red-500 text-sm">{error}</p>
        </div>
        <button
          onClick={load}
          className="px-5 py-2.5 rounded-xl bg-[#173E7D] text-white font-bold text-sm flex items-center gap-2"
        >
          <RefreshCw size={15} /> {t('Réessayer', 'إعادة المحاولة')}
        </button>
      </div>
    );
  }

  const { plan, quota, current, daysRemaining, history, usage, memberSince, verified } = data;
  const planName = PLAN_LABEL[plan]?.[isRTL ? 'ar' : 'fr'] ?? plan;
  const isCorporate = plan === 'CORPORATE';

  // The term bar only means something when there is a recorded term.
  const termProgress = (() => {
    if (!current) return null;
    const start = new Date(current.startsAt).getTime();
    const end = new Date(current.endsAt).getTime();
    if (!(end > start)) return null;
    const elapsed = ((Date.now() - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, elapsed));
  })();

  const effectiveStatus = current?.status ?? null;

  // Past terms only — the current one already has a panel of its own.
  const pastTerms = history.filter((h) => h.id !== current?.id);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ plan and term --- */}
      <div
        className={`rounded-[2.5rem] border shadow-sm overflow-hidden ${
          isCorporate
            ? 'bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] border-[#D4AF37]/40'
            : 'bg-white border-gray-100'
        }`}
      >
        <div className="p-8 md:p-10">
          <div
            className={`flex flex-wrap items-start justify-between gap-6 ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <div className={isRTL ? 'text-right' : ''}>
              <p
                className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                  isCorporate ? 'text-[#D4AF37]' : 'text-gray-400'
                }`}
              >
                {t('Votre abonnement', 'اشتراكك')}
              </p>

              <div
                className={`flex items-center gap-3 mt-3 flex-wrap ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                <h3
                  className={`text-3xl font-display font-black tracking-tight ${
                    isCorporate ? 'text-white' : 'text-[#173E7D]'
                  }`}
                >
                  {planName}
                </h3>

                {isCorporate ? (
                  <Crown size={20} className="text-[#D4AF37]" />
                ) : plan === 'PREMIUM' ? (
                  <Sparkles size={18} className="text-[#F68D58]" />
                ) : null}

                {effectiveStatus && (
                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                      STATUS_STYLE[effectiveStatus] ?? STATUS_STYLE.PENDING
                    }`}
                  >
                    {statusLabel(effectiveStatus)}
                  </span>
                )}

                {verified && (
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-[#173E7D] border border-blue-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <BadgeCheck size={12} /> {t('Vérifiée', 'موثقة')}
                  </span>
                )}
              </div>

              <p
                className={`mt-2 text-sm font-medium ${
                  isCorporate ? 'text-white/60' : 'text-gray-500'
                }`}
              >
                {t('Compte créé le', 'أُنشئ الحساب في')} {fmtDate(memberSince)}
              </p>
            </div>

            {/* Days left, or an honest note that there is no term to count. */}
            <div
              className={`rounded-3xl px-6 py-5 min-w-[180px] ${
                isCorporate ? 'bg-white/10 border border-white/15' : 'bg-gray-50 border border-gray-100'
              } ${isRTL ? 'text-right' : ''}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  isCorporate ? 'text-white/50' : 'text-gray-400'
                }`}
              >
                {t('Échéance', 'الاستحقاق')}
              </p>
              {current && daysRemaining !== null ? (
                <>
                  <p
                    className={`text-3xl font-black mt-1 ${
                      daysRemaining <= 7
                        ? 'text-red-500'
                        : isCorporate
                          ? 'text-white'
                          : 'text-[#173E7D]'
                    }`}
                  >
                    {daysRemaining}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      isCorporate ? 'text-white/60' : 'text-gray-500'
                    }`}
                  >
                    {t('jours restants', 'يوماً متبقياً')}
                  </p>
                </>
              ) : (
                <p
                  className={`text-sm font-bold mt-2 leading-snug ${
                    isCorporate ? 'text-white/70' : 'text-gray-500'
                  }`}
                >
                  {t('Aucune échéance enregistrée', 'لا يوجد تاريخ استحقاق مسجل')}
                </p>
              )}
            </div>
          </div>

          {/* The recorded term, when there is one. */}
          {current ? (
            <div className="mt-8">
              <div
                className={`flex flex-wrap items-center justify-between gap-3 text-xs font-bold ${
                  isCorporate ? 'text-white/70' : 'text-gray-500'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <CalendarClock size={14} />
                  {t('Début', 'البداية')} : {fmtDate(current.startsAt)}
                </span>
                <span>
                  {t('Fin', 'النهاية')} : {fmtDate(current.endsAt)}
                </span>
              </div>

              {termProgress !== null && (
                <div
                  className={`mt-3 h-2 rounded-full overflow-hidden ${
                    isCorporate ? 'bg-white/15' : 'bg-gray-100'
                  }`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#173E7D] to-[#F68D58]"
                    style={{ width: `${termProgress}%` }}
                  />
                </div>
              )}

              <p
                className={`mt-3 text-xs font-medium ${
                  isCorporate ? 'text-white/50' : 'text-gray-400'
                }`}
              >
                {current.autoRenew
                  ? t('Renouvellement automatique activé.', 'التجديد التلقائي مفعّل.')
                  : t(
                      'Sans renouvellement automatique — contactez-nous pour prolonger.',
                      'بدون تجديد تلقائي — اتصل بنا للتمديد.'
                    )}
              </p>
            </div>
          ) : (
            <p
              className={`mt-6 text-sm font-medium leading-relaxed ${
                isCorporate ? 'text-white/60' : 'text-gray-500'
              } ${isRTL ? 'text-right' : ''}`}
            >
              {plan === 'FREE'
                ? t(
                    "Le plan Gratuit n'a pas de durée : il vous donne une seule offre, sans échéance.",
                    'الباقة المجانية بلا مدة: تمنحك عرضاً واحداً فقط، دون تاريخ انتهاء.'
                  )
                : t(
                    "Aucune période d'abonnement n'est enregistrée pour ce compte.",
                    'لا توجد فترة اشتراك مسجلة لهذا الحساب.'
                  )}
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ tracking --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={18} />}
          label={t('Annonces publiées', 'الإعلانات المنشورة')}
          value={String(quota.used)}
          hint={
            usage.jobs.byStatus.PUBLISHED !== undefined
              ? `${usage.jobs.byStatus.PUBLISHED} ${t('en ligne', 'منشور')}`
              : t('aucune en ligne', 'لا شيء منشور')
          }
          isRTL={isRTL}
        />

        <StatCard
          icon={quota.remaining === null ? <InfinityIcon size={18} /> : <Briefcase size={18} />}
          label={t('Annonces restantes', 'الإعلانات المتبقية')}
          value={quota.remaining === null ? '∞' : String(quota.remaining)}
          hint={
            quota.remaining === null
              ? t('publication illimitée', 'نشر غير محدود')
              : quota.canPublish
                ? t('vous pouvez publier', 'يمكنك النشر')
                : t('plus de publication possible', 'لا يمكنك النشر')
          }
          tone={quota.remaining !== null && !quota.canPublish ? 'danger' : 'default'}
          isRTL={isRTL}
        />

        <StatCard
          icon={<CreditCard size={18} />}
          label={t('Crédits achetés', 'الأرصدة المشتراة')}
          value={String(quota.credits)}
          hint={t("annonces payées en réserve", 'إعلانات مدفوعة في الرصيد')}
          isRTL={isRTL}
        />

        <StatCard
          icon={<Users size={18} />}
          label={t('Candidatures reçues', 'الترشيحات المستلمة')}
          value={String(usage.applications)}
          hint={t('toutes offres confondues', 'لكل العروض')}
          isRTL={isRTL}
        />
      </div>

      {/* Why publishing is blocked, said in the server's own words. */}
      {!quota.canPublish && quota.reason && (
        <div
          className={`rounded-3xl border border-amber-100 bg-amber-50 p-6 flex flex-wrap items-center justify-between gap-4 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-amber-700">{quota.reason}</p>
          </div>
          {onBuyPostings && (
            <button
              onClick={onBuyPostings}
              className="px-5 py-2.5 rounded-xl bg-[#173E7D] text-white font-bold text-sm hover:bg-[#F68D58] transition-colors shrink-0"
            >
              {t('Acheter des annonces', 'شراء إعلانات')}
            </button>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- history --- */}
      {pastTerms.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <h4
            className={`text-lg font-display font-black text-[#173E7D] tracking-tight ${
              isRTL ? 'text-right' : ''
            }`}
          >
            {t('Historique des abonnements', 'سجل الاشتراكات')}
          </h4>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className={`pb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('Plan', 'الباقة')}
                  </th>
                  <th className={`pb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('Période', 'الفترة')}
                  </th>
                  <th className={`pb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('Statut', 'الحالة')}
                  </th>
                  <th className={`pb-3 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t('Paiements', 'المدفوعات')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pastTerms.map((term) => (
                  <HistoryRow
                    key={term.id}
                    term={term}
                    isRTL={isRTL}
                    fmtDate={fmtDate}
                    statusLabel={statusLabel}
                    noPayment={t('—', '—')}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  isRTL,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'danger';
  isRTL: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-3xl border p-6 shadow-sm ${
        tone === 'danger' ? 'border-red-100' : 'border-gray-100'
      } ${isRTL ? 'text-right' : ''}`}
    >
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
          tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#173E7D]'
        } ${isRTL ? 'ml-auto' : ''}`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">{label}</p>
      <p
        className={`text-3xl font-black mt-1 ${
          tone === 'danger' ? 'text-red-500' : 'text-[#173E7D]'
        }`}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function HistoryRow({
  term,
  isRTL,
  fmtDate,
  statusLabel,
  noPayment,
}: {
  term: SubscriptionRecord;
  isRTL: boolean;
  fmtDate: (iso: string) => string;
  statusLabel: (s: string) => string;
  noPayment: string;
}) {
  const paid = term.payments.filter((p) => p.status === 'PAID');
  const total = paid.reduce((sum, p) => sum + p.amount, 0);

  return (
    <tr className="text-gray-600 font-medium">
      <td className={`py-3 font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
        {PLAN_LABEL[term.plan]?.[isRTL ? 'ar' : 'fr'] ?? term.plan}
      </td>
      <td className={`py-3 ${isRTL ? 'text-right' : ''}`}>
        {fmtDate(term.startsAt)} → {fmtDate(term.endsAt)}
      </td>
      <td className={`py-3 ${isRTL ? 'text-right' : ''}`}>
        <span
          className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
            STATUS_STYLE[term.status] ?? STATUS_STYLE.PENDING
          }`}
        >
          {statusLabel(term.status)}
        </span>
      </td>
      <td className={`py-3 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>
        {paid.length > 0
          ? `${total.toLocaleString('fr-FR')} ${paid[0].currency}`
          : noPayment}
      </td>
    </tr>
  );
}
