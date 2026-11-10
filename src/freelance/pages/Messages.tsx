import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import messaging, {
  ATTACHMENT_ACCEPT,
  Attachment,
  ChatMessage,
  MAX_ATTACHMENTS,
  Peer,
  Thread,
} from "../messaging";
import { useAuth } from "../auth";
import { EmptyState, ErrorState, Loading } from "../ui";
import { useI18n } from "../i18n";
import SignIn from "./SignIn";
import OfferPanel from "../OfferPanel";

/**
 * Messages.
 *
 * Deliberately outside the freelancer workspace. That shell gates on an
 * activated freelance profile, and a client who posted a project has none —
 * they would be shown the activation form to read their own replies. Both
 * sides of a conversation need the same inbox, so it lives at /messages and
 * gates on nothing but a session.
 *
 * Two panes on a wide screen, one at a time on a narrow one. The thread list
 * is the page at /messages, a thread is the page at /messages/:id, and the
 * router decides which — so the back button works on a phone instead of
 * dumping the reader out of the inbox entirely.
 *
 * Polling, not a socket. The thread asks only for messages newer than the
 * last one it holds, so an open conversation is a small query every four
 * seconds rather than another service to run.
 */

const POLL_MS = 4000;

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** Clock for today, date for anything older — the usual inbox convention. */
const stamp = (iso: string, lang: string) => {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-FR";

  return sameDay
    ? date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
};

/* -------------------------------------------------------------------------- */
/*                               The thread list                              */
/* -------------------------------------------------------------------------- */

const ThreadList: React.FC<{ activeId?: string }> = ({ activeId }) => {
  const { t, lang } = useI18n();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    messaging
      .list()
      .then((d) => setThreads(d.threads))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    load();
    // Re-read when a thread is opened, so its unread badge clears here too.
  }, [activeId]);

  // The list refreshes on its own as well: a reply to a thread the reader is
  // not looking at should show up without a reload.
  useEffect(() => {
    const timer = setInterval(load, POLL_MS * 3);
    return () => clearInterval(timer);
  }, []);

  if (failed) return <ErrorState onRetry={load} />;
  if (!threads) return <Loading />;

  if (!threads.length) {
    return (
      <div>
        <EmptyState message={t("msg.empty")} />
        <p className="mt-3 text-center text-sm text-[#2B3442]/50">{t("msg.emptyHint")}</p>
      </div>
    );
  }

  return (
    <ul className="rounded-2xl border-2 border-[#173E7D]/15 bg-white divide-y divide-[#173E7D]/10 overflow-hidden">
      {threads.map((thread) => {
        const name = thread.with?.name ?? "—";
        const active = thread.id === activeId;

        return (
          <li key={thread.id}>
            <Link
              to={`/messages/${thread.id}`}
              className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                active ? "bg-[#173E7D]/8" : "hover:bg-[#173E7D]/4"
              }`}
            >
              <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display text-sm">
                {initial(name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-bold text-[#173E7D] text-sm truncate">{name}</span>
                  <span className="ms-auto shrink-0 text-[10px] font-semibold text-[#2B3442]/40">
                    {stamp(thread.updatedAt, lang)}
                  </span>
                </span>

                {thread.order && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                    <ShoppingBag size={11} /> {thread.order.reference}
                  </span>
                )}

                <span className="mt-0.5 flex items-center gap-2">
                  <span className="text-[13px] text-[#2B3442]/60 truncate">
                    {thread.lastMessage
                      ? `${thread.lastMessage.mine ? `${t("msg.you")}: ` : ""}${
                          thread.lastMessage.body ?? "—"
                        }`
                      : t("msg.noMessages")}
                  </span>
                  {thread.unread > 0 && (
                    <span className="ms-auto shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-[#173E7D] text-white text-[10px] font-black">
                      {thread.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

/** Readable size, so "is this worth opening on data" has an answer. */
const weigh = (bytes: number | null) => {
  if (!bytes) return "";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
};

/**
 * One file in a message.
 *
 * An image is shown; anything else is a line with its name. A thumbnail of a
 * PDF would be a grey rectangle, and the name is what tells somebody whether
 * it is the brief they were waiting for.
 */
const AttachmentView: React.FC<{ file: Attachment; mine: boolean }> = ({ file, mine }) => {
  const isImage = (file.mimeType ?? "").startsWith("image/");

  // Signing failed. The name still tells them something arrived, which beats
  // a broken link or nothing at all.
  if (!file.url) {
    return (
      <p
        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs ${
          mine ? "bg-white/15 text-white/80" : "bg-[#173E7D]/8 text-[#2B3442]/70"
        }`}
      >
        <FileText size={13} /> {file.fileName ?? "Fichier"} — lien indisponible
      </p>
    );
  }

  if (isImage) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
        <img
          src={file.url}
          alt={file.fileName ?? ""}
          loading="lazy"
          className="max-h-56 w-auto rounded-xl border border-black/10 object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
        mine ? "bg-white/15 text-white hover:bg-white/25" : "bg-[#173E7D]/8 text-[#173E7D] hover:bg-[#173E7D]/15"
      }`}
    >
      <FileText size={14} className="shrink-0" />
      <span className="min-w-0 break-all">{file.fileName ?? "Fichier"}</span>
      <span className="opacity-60 shrink-0">{weigh(file.size)}</span>
    </a>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 One thread                                 */
/* -------------------------------------------------------------------------- */

const Conversation: React.FC<{ id: string }> = ({ id }) => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [peer, setPeer] = useState<Peer | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const bottom = useRef<HTMLDivElement>(null);
  /* The newest message this thread holds. Kept in a ref rather than read from
     state inside the poll, so the interval does not need re-creating — and so
     two polls cannot both ask from the same point and duplicate a message. */
  const since = useRef<string | undefined>(undefined);

  /** Appends only what is genuinely new; a repeated id is dropped. */
  const merge = (incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set((prev ?? []).map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...(prev ?? []), ...fresh] : prev;
    });
    since.current = incoming[incoming.length - 1].createdAt;
  };

  // Full load on mount and whenever the thread changes.
  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    setFailed(null);
    since.current = undefined;

    messaging
      .thread(id)
      .then((d) => {
        if (cancelled) return;
        setPeer(d.conversation.with);
        setOrderId(d.conversation.orderId);
        setMessages(d.messages);
        if (d.messages.length) {
          since.current = d.messages[d.messages.length - 1].createdAt;
        }
      })
      .catch((e) =>
        !cancelled && setFailed(e?.response?.data?.message ?? t("common.error"))
      );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Then poll for the rest.
  useEffect(() => {
    const timer = setInterval(() => {
      messaging
        .thread(id, since.current)
        .then((d) => merge(d.messages))
        // A failed poll is not worth a visible error: the next one is four
        // seconds away, and the thread already on screen is still correct.
        .catch(() => undefined);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [id]);

  // Only when something arrived, so the view does not jump while reading.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages?.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    // A message may be files alone: "here is the brief" needs no sentence.
    if ((!body && files.length === 0) || sending) return;

    setSending(true);
    try {
      const sent = await messaging.send(id, body, files);
      merge([sent]);
      setDraft("");
      setFiles([]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFailed(e?.response?.data?.message ?? t("common.error"));
    } finally {
      setSending(false);
    }
  };

  if (failed && !messages) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
        <p className="font-bold text-red-700">{failed}</p>
        <button
          onClick={() => navigate("/messages")}
          className="mt-4 rounded-full px-5 py-2 bg-[#173E7D] text-white text-sm font-bold"
        >
          {t("msg.threads")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#173E7D]/15 bg-white flex flex-col h-[70vh] min-h-[26rem] overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#173E7D]/10 shrink-0">
        {/* Back to the list, which on a narrow screen is the whole page. */}
        <Link
          to="/messages"
          className="lg:hidden p-1.5 -ms-1.5 rounded-lg text-[#173E7D]/60 hover:text-[#173E7D]"
          aria-label={t("msg.threads")}
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>

        <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display text-sm">
          {initial(peer?.name ?? "?")}
        </span>

        <div className="min-w-0">
          {peer?.username ? (
            <Link
              to={`/@${peer.username}`}
              className="font-bold text-[#173E7D] text-sm truncate hover:underline block"
            >
              {peer.name}
            </Link>
          ) : (
            <p className="font-bold text-[#173E7D] text-sm truncate">{peer?.name ?? "—"}</p>
          )}
          {orderId && (
            <Link
              to={`/freelance-espace/commandes/${orderId}`}
              className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
            >
              {t("msg.aboutOrder")}
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Above the messages, not among them: an offer is the one thing in a
            conversation that has to be found again later, and a card that
            scrolls away with the chat is one the client has to hunt for. */}
        <OfferPanel conversationId={id} onOrderCreated={() => navigate(`/messages/${id}`)} />

        {!messages ? (
          <Loading />
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[#2B3442]/50 py-8">{t("msg.noMessages")}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[min(32rem,85%)]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                    m.mine
                      ? "bg-[#173E7D] text-white rounded-se-sm"
                      : "bg-[#173E7D]/8 text-[#2B3442] rounded-ss-sm"
                  }`}
                >
                  {m.body}
                  {m.attachments?.map((file) => (
                    <AttachmentView key={file.id} file={file} mine={m.mine} />
                  ))}
                </div>

                <p
                  className={`mt-1 text-[10px] font-semibold text-[#2B3442]/40 ${
                    m.mine ? "text-end" : "text-start"
                  }`}
                >
                  {stamp(m.createdAt, lang)}
                </p>

                {/* Shown to the sender only — see the service. */}
                {m.flagged && (
                  <p className="mt-1 inline-flex items-start gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                    <AlertTriangle size={13} className="mt-px shrink-0" />
                    {t("msg.flagged")}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      {failed && messages && (
        <p className="px-4 pb-2 text-[12px] font-semibold text-red-600">{failed}</p>
      )}

      {/* Chosen but not sent. Shown so nobody wonders whether the file
          attached, and removable without clearing the message. */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3 shrink-0">
          {files.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#173E7D]/8 px-3 py-1.5 text-xs text-[#173E7D]"
            >
              {file.type.startsWith("image/") ? <ImageIcon size={12} /> : <FileText size={12} />}
              <span className="max-w-[12rem] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}
                aria-label={`Retirer ${file.name}`}
                className="opacity-60 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 p-3 border-t border-[#173E7D]/10 shrink-0">
        <label
          className={`shrink-0 w-11 h-11 grid place-items-center rounded-xl border-2 border-[#173E7D]/15 text-[#173E7D]/60 hover:text-[#173E7D] cursor-pointer ${
            files.length >= MAX_ATTACHMENTS ? "opacity-40 pointer-events-none" : ""
          }`}
          title={`Joindre un fichier (${MAX_ATTACHMENTS} maximum)`}
        >
          <Paperclip size={17} />
          <input
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              // Trimmed here as well as refused there, so picking ten is not
              // how somebody discovers the limit.
              setFiles((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
              e.target.value = "";
            }}
          />
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line: the convention every
            // other chat on a phone or a desktop already uses.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          rows={1}
          maxLength={5000}
          placeholder={t("msg.placeholder")}
          className="flex-1 resize-none rounded-xl border-2 border-[#173E7D]/15 px-3.5 py-2.5 text-sm max-h-32 focus:outline-none focus:border-[#173E7D]/40"
        />
        <button
          type="submit"
          disabled={sending || (!draft.trim() && files.length === 0)}
          aria-label={t("msg.send")}
          className="shrink-0 w-11 h-11 grid place-items-center rounded-xl bg-[#173E7D] text-white disabled:opacity-40"
        >
          {sending ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Send size={17} className="rtl:rotate-180" />
          )}
        </button>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  The page                                  */
/* -------------------------------------------------------------------------- */

const Messages: React.FC = () => {
  const { t } = useI18n();
  const { signedIn, loading } = useAuth();
  const { id } = useParams<{ id: string }>();

  if (loading) return <Loading />;
  if (!signedIn) return <SignIn />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-display font-bold text-[#173E7D] mb-5 inline-flex items-center gap-2">
        <MessageSquare size={22} /> {t("msg.title")}
      </h1>

      <p className="mb-5 rounded-xl bg-[#173E7D]/5 border border-[#173E7D]/15 px-4 py-3 text-[13px] text-[#2B3442]/70">
        {t("msg.offPlatform")}
      </p>

      <div className="flex gap-6">
        {/* The list hides on a narrow screen once a thread is open, so the
            thread gets the whole width instead of a cramped column. */}
        <div className={`lg:w-80 shrink-0 min-w-0 ${id ? "hidden lg:block" : "w-full"}`}>
          <ThreadList activeId={id} />
        </div>

        <div className={`flex-1 min-w-0 ${id ? "" : "hidden lg:block"}`}>
          {id ? (
            <Conversation id={id} />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-[#173E7D]/15 h-full min-h-[26rem] grid place-items-center">
              <p className="text-sm text-[#2B3442]/50">{t("msg.pick")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
