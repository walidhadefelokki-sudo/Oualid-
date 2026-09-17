import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import paymentService, { Invoice } from "../../services/payment.service";

interface Props {
  language: "fr" | "ar" | "en";
  /** Bumped by the parent after a payment lands, to pull the new invoice in. */
  refreshKey?: number;
}

/**
 * Receipts for annonce packs.
 *
 * Lists only paid orders — an abandoned checkout is not a document anyone
 * wants filed. The PDF is rendered by the server on request from the same row
 * shown here, so the two cannot disagree.
 */
export default function InvoiceList({ language, refreshKey = 0 }: Props) {
  const isRTL = language === "ar";
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setInvoices(await paymentService.listInvoices());
    } catch (err) {
      const detail = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(detail || t("Impossible de charger vos factures.", "تعذر تحميل فواتيرك."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleDownload = async (invoice: Invoice) => {
    setDownloading(invoice.id);
    try {
      await paymentService.downloadInvoice(invoice);
    } catch {
      setError(t("Le téléchargement a échoué.", "فشل التنزيل."));
    } finally {
      setDownloading(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10">
      <div className={`flex flex-wrap items-center justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h3 className="text-2xl font-display font-black text-[#173E7D] tracking-tight">
            {t("Mes factures", "فواتيري")}
          </h3>
          <p className="text-gray-500 font-medium mt-1 text-sm">
            {t(
              "Chaque achat de pack d'annonces, avec son reçu en PDF.",
              "كل شراء لباقة إعلانات، مع إيصاله بصيغة PDF."
            )}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:text-[#173E7D] hover:border-[#173E7D] transition-colors disabled:opacity-50"
          aria-label={t("Actualiser", "تحديث")}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className={`mt-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-500">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-14 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="font-bold text-sm">{t("Chargement…", "جارٍ التحميل…")}</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
            <FileText size={26} />
          </div>
          <p className="font-black text-[#173E7D] mt-5">
            {t("Aucune facture", "لا توجد فواتير")}
          </p>
          <p className="text-gray-400 font-medium mt-2 max-w-sm mx-auto text-sm">
            {t(
              "Vos reçus apparaîtront ici dès votre premier achat d'annonces.",
              "ستظهر إيصالاتك هنا بمجرد أول شراء للإعلانات."
            )}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className={`pb-3 ${isRTL ? "text-right" : "text-left"}`}>{t("Facture", "الفاتورة")}</th>
                <th className={`pb-3 ${isRTL ? "text-right" : "text-left"}`}>{t("Date", "التاريخ")}</th>
                <th className={`pb-3 ${isRTL ? "text-right" : "text-left"}`}>{t("Annonces", "الإعلانات")}</th>
                <th className={`pb-3 ${isRTL ? "text-left" : "text-right"}`}>{t("Montant", "المبلغ")}</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="text-gray-600 font-medium">
                  <td className={`py-4 font-bold text-[#173E7D] ${isRTL ? "text-right" : ""}`}>
                    {invoice.invoiceNumber}
                  </td>
                  <td className={`py-4 ${isRTL ? "text-right" : ""}`}>{fmtDate(invoice.paidAt)}</td>
                  <td className={`py-4 ${isRTL ? "text-right" : ""}`}>{invoice.jobs}</td>
                  <td dir="ltr" className={`py-4 font-bold text-[#173E7D] ${isRTL ? "text-left" : "text-right"}`}>
                    {invoice.amount.toLocaleString("fr-FR")} {invoice.currency.toUpperCase()}
                  </td>
                  <td className={`py-4 ${isRTL ? "text-left" : "text-right"}`}>
                    <button
                      onClick={() => handleDownload(invoice)}
                      disabled={downloading === invoice.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#173E7D] text-white text-xs font-black uppercase tracking-widest hover:bg-[#F68D58] transition-colors disabled:opacity-60"
                    >
                      {downloading === invoice.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
