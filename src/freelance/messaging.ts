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
  url: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
}

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

  send: async (id: string, body: string): Promise<ChatMessage> => {
    const { data } = await api.post(`/freelance/me/conversations/${id}/messages`, { body });
    return data.data.message;
  },

  markRead: (id: string) => api.post(`/freelance/me/conversations/${id}/read`),
};

export default messaging;
