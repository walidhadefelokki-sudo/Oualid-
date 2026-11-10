import api from "../services/api";

/**
 * The messaging calls, in one place.
 *
 * Kept out of `freelance.service.ts` because that file is the public,
 * unauthenticated reads; everything here needs a session.
 */

export interface Peer {
  id: string;
  name: string;
  /** Set when the other side is a freelancer, so their page can be linked. */
  username: string | null;
}

export interface Attachment {
  id: string;
  /**
   * A short-lived signed link, since the bucket is private.
   *
   * Null when signing failed. A conversation whose files are briefly
   * unavailable is still a conversation, so the read returns the message
   * rather than failing — the UI shows the name without a link.
   */
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
}

/** Images and PDFs; see the validator for why not anything. */
export const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
export const MAX_ATTACHMENTS = 5;

export interface ChatMessage {
  id: string;
  body: string | null;
  mine: boolean;
  createdAt: string;
  /**
   * Only ever true on your own message. The platform tells you when something
   * you wrote looked like an attempt to take the deal elsewhere; it does not
   * tell the person you wrote to.
   */
  flagged: boolean;
  attachments: Attachment[];
}

export interface Thread {
  id: string;
  updatedAt: string;
  order: { id: string; reference: string } | null;
  with: Peer | null;
  lastMessage: { body: string | null; mine: boolean; createdAt: string } | null;
  unread: number;
}

export interface OpenRequest {
  /** A freelancer's public handle, with or without the leading @. */
  username?: string;
  projectId?: string;
  orderId?: string;
}

const messaging = {
  /** Opens a thread or returns the existing one. Safe to call repeatedly. */
  open: async (what: OpenRequest): Promise<{ id: string }> => {
    const { data } = await api.post("/freelance/me/conversations", what);
    return data.data.conversation;
  },

  list: async (page = 1): Promise<{ threads: Thread[]; total: number }> => {
    const { data } = await api.get("/freelance/me/conversations", { params: { page } });
    return data.data;
  },

  unread: async (): Promise<number> => {
    const { data } = await api.get("/freelance/me/conversations/unread");
    return data.data.unread;
  },

  /**
   * One thread. `after` asks only for what has arrived since, which is what
   * makes polling an open thread cheap.
   */
  thread: async (
    id: string,
    after?: string
  ): Promise<{ conversation: { id: string; orderId: string | null; with: Peer | null }; messages: ChatMessage[] }> => {
    const { data } = await api.get(`/freelance/me/conversations/${id}`, {
      params: after ? { after } : undefined,
    });
    return data.data;
  },

  /**
   * Sends a message, with files when there are any.
   *
   * One request either way. Uploading first and sending second would leave a
   * file behind every time somebody attaches something and then changes their
   * mind, and nothing would collect it.
   */
  send: async (id: string, body: string, files: File[] = []): Promise<ChatMessage> => {
    const path = `/freelance/me/conversations/${id}/messages`;

    if (files.length === 0) {
      const { data } = await api.post(path, { body });
      return data.data.message;
    }

    const form = new FormData();
    form.append("body", body);
    for (const file of files) form.append("attachments", file);

    const { data } = await api.post(path, form);
    return data.data.message;
  },

  markRead: (id: string) => api.post(`/freelance/me/conversations/${id}/read`),
};

export default messaging;

/* -------------------------------------------------------------------------- */
/*                          offers quoted in a thread                         */
/* -------------------------------------------------------------------------- */

export type OfferStatus = "SENT" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED";

export interface CustomOffer {
  id: string;
  conversationId: string;
  title: string;
  description: string | null;
  price: number;
  deliveryDays: number;
  revisions: number;
  status: OfferStatus;
  expiresAt: string | null;
  respondedAt: string | null;
  orderId: string | null;
  createdAt: string;
  order: { id: string; reference: string; status: string } | null;
}

export interface NewOffer {
  title: string;
  description?: string;
  price: number;
  deliveryDays: number;
  revisions?: number;
  /** Days the offer stands. The server defaults to 7. */
  validDays?: number;
}

export const offersApi = {
  /**
   * The thread's offers, and whether this reader may send one.
   *
   * The side comes from the server because it cannot be inferred from the
   * offers themselves — before the first one exists there is nothing to
   * infer it from.
   */
  list: async (
    conversationId: string
  ): Promise<{ offers: CustomOffer[]; canSendOffer: boolean }> => {
    const { data } = await api.get(`/freelance/me/conversations/${conversationId}/offers`);
    return data.data;
  },

  send: async (conversationId: string, offer: NewOffer): Promise<CustomOffer> => {
    const { data } = await api.post(
      `/freelance/me/conversations/${conversationId}/offers`,
      offer
    );
    return data.data.offer;
  },

  /** Accepting returns the order it created, not only the offer. */
  accept: async (
    offerId: string
  ): Promise<{ offer: CustomOffer; order: { id: string; reference: string } }> => {
    const { data } = await api.post(`/freelance/me/offers/${offerId}/accept`);
    return data.data;
  },

  decline: async (offerId: string): Promise<CustomOffer> => {
    const { data } = await api.post(`/freelance/me/offers/${offerId}/decline`);
    return data.data.offer;
  },

  withdraw: async (offerId: string): Promise<CustomOffer> => {
    const { data } = await api.post(`/freelance/me/offers/${offerId}/withdraw`);
    return data.data.offer;
  },
};
