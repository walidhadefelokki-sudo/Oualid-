import api from "./api";

/**
 * Annonce pack purchases.
 *
 * Note what is *not* here: an amount. The checkout call sends a pack id and
 * nothing else, and the server prices it from its own catalogue — so editing a
 * price in the browser changes a label and never the charge.
 */

export interface Invoice {
  id: string;
  invoiceNumber: string;
  packId: string;
  jobs: number;
  /** Whole dinars. */
  amount: number;
  currency: string;
  paidAt: string;
  checkoutId: string | null;
}

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";

export interface OrderState {
  id: string;
  status: OrderStatus;
  jobs: number;
  amount: number;
  currency: string;
  invoiceNumber: string | null;
  paidAt: string | null;
}

export const paymentService = {
  /**
   * Opens a Chargily checkout for a pack and returns where to send the buyer.
   * The caller navigates; it is a hosted page, not an embedded form.
   */
  async startCheckout(packId: string): Promise<{ orderId: string; checkoutUrl: string }> {
    const { data } = await api.post("/payments/checkout", { packId });
    return data.data;
  },

  /**
   * Chargily returns the browser before its webhook has necessarily landed, so
   * the success screen polls this rather than assuming the payment went
   * through because the redirect said so.
   */
  async getOrder(orderId: string): Promise<OrderState> {
    const { data } = await api.get(`/payments/orders/${orderId}`);
    return data.data.order;
  },

  async listInvoices(): Promise<Invoice[]> {
    const { data } = await api.get("/payments/invoices");
    return data.data.invoices;
  },

  /**
   * Downloads one invoice as a PDF.
   *
   * Fetched through the API client rather than linked directly, because the
   * endpoint needs the Authorization header — a plain <a href> would arrive
   * unauthenticated and 401.
   */
  async downloadInvoice(invoice: Pick<Invoice, "id" | "invoiceNumber">): Promise<void> {
    const response = await api.get(`/payments/invoices/${invoice.id}/pdf`, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Freed on the next tick; revoking immediately can cancel the download in
    // some browsers before it has read the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export default paymentService;
