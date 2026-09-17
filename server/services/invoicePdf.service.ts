import { jsPDF } from "jspdf";

/**
 * Renders a paid order as a PDF invoice.
 *
 * Built on demand from the PackOrder row rather than stored as a file: the row
 * already holds everything the document says, so keeping a second copy on disk
 * only creates something that can drift from it.
 *
 * jsPDF's built-in fonts are Latin-1 only, so this document is French. Arabic
 * would need an embedded font with shaping, which is a much larger change than
 * the invoice warrants.
 */

const NAVY = { r: 23, g: 62, b: 125 };
const ORANGE = { r: 246, g: 141, b: 88 };
const GREY = { r: 107, g: 118, b: 134 };

export interface InvoiceData {
  invoiceNumber: string;
  paidAt: Date;
  companyName: string;
  buyerEmail: string | null;
  packId: string;
  jobs: number;
  /** Whole dinars. */
  amount: number;
  currency: string;
  checkoutId: string | null;
}

/** "5 900,00 DZD" — French formatting, which is what the app uses throughout. */
const money = (amount: number, currency: string) =>
  `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;

const date = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const renderInvoicePdf = (data: InvoiceData): Buffer => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 56;
  const right = pageWidth - 56;

  /* ------------------------------------------------------------ header --- */
  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(0, 0, pageWidth, 110, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Dar L'emploi", left, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Plateforme de recrutement - Algerie", left, 72);
  doc.text("darlemploi.dz", left, 88);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FACTURE", right, 52, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.invoiceNumber, right, 72, { align: "right" });
  doc.text(date(data.paidAt), right, 88, { align: "right" });

  /* ------------------------------------------------------------- payee --- */
  let y = 160;
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.setFontSize(9);
  doc.text("FACTURE A", left, y);

  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.companyName, left, y);

  if (data.buyerEmail) {
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(GREY.r, GREY.g, GREY.b);
    doc.text(data.buyerEmail, left, y);
  }

  /* ------------------------------------------------------------- lines --- */
  y += 46;
  doc.setFillColor(245, 247, 250);
  doc.rect(left, y - 16, right - left, 28, "F");
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESIGNATION", left + 12, y + 2);
  doc.text("QTE", right - 150, y + 2, { align: "right" });
  doc.text("MONTANT", right - 12, y + 2, { align: "right" });

  y += 42;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Pack d'annonces (${data.packId})`, left + 12, y);
  doc.text(String(data.jobs), right - 150, y, { align: "right" });
  doc.text(money(data.amount, data.currency), right - 12, y, { align: "right" });

  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.text(
    `${data.jobs} annonce${data.jobs > 1 ? "s" : ""} creditee${data.jobs > 1 ? "s" : ""} sur le compte`,
    left + 12,
    y
  );

  /* ------------------------------------------------------------- total --- */
  y += 40;
  doc.setDrawColor(230, 233, 238);
  doc.line(left, y, right, y);

  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  doc.text("TOTAL PAYE", right - 150, y, { align: "right" });
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b);
  doc.setFontSize(15);
  doc.text(money(data.amount, data.currency), right - 12, y, { align: "right" });

  /* ------------------------------------------------------------ status --- */
  y += 34;
  doc.setFillColor(232, 248, 240);
  doc.roundedRect(left, y - 16, 150, 26, 6, 6, "F");
  doc.setTextColor(16, 138, 91);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAIEMENT CONFIRME", left + 12, y + 1);

  /* ------------------------------------------------------------ footer --- */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);

  let fy = 720;
  doc.text(`Regle par Chargily Pay le ${date(data.paidAt)}.`, left, fy);
  if (data.checkoutId) {
    fy += 13;
    doc.text(`Reference de transaction : ${data.checkoutId}`, left, fy);
  }
  fy += 13;
  doc.text("Ce document est genere automatiquement et ne necessite pas de signature.", left, fy);

  return Buffer.from(doc.output("arraybuffer"));
};
