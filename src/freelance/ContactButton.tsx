import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import messaging, { OpenRequest } from "./messaging";
import { useAuth } from "./auth";
import { useI18n } from "./i18n";
import { btn } from "./ui";

/**
 * The way a conversation starts.
 *
 * It takes the context it is placed in — a freelancer's handle, a project, an
 * order — never a user id. The server resolves the account behind that
 * context, which is what stops this from being an endpoint for messaging
 * anyone on the platform whose id you happen to know.
 *
 * Opening is idempotent: the server returns the existing thread if there is
 * one, so clicking twice lands in the same conversation rather than splitting
 * it. That also means this needs no "already contacted" state of its own.
 */

interface Props extends OpenRequest {
  label?: string;
  /** `solid` for the primary action on a page, `outline` beside one. */
  variant?: "solid" | "outline";
  /** `sm` where it sits in a row of chips rather than under a price. */
  size?: "md" | "sm";
  className?: string;
}

const ContactButton: React.FC<Props> = ({
  label,
  variant = "outline",
  size = "md",
  className = "",
  ...context
}) => {
  const { t } = useI18n();
  const { signedIn } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    // Sign-in screens live at /connexion and come back here, so the message
    // the reader meant to write is one step away rather than lost.
    if (!signedIn) {
      navigate("/connexion");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const conversation = await messaging.open(context);
      navigate(`/messages/${conversation.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const icon = size === "sm" ? 13 : 16;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className={btn(
          variant === "solid" ? "primary" : "ghost",
          size === "sm" ? "min-h-9 px-4 text-[13px]" : "w-full"
        )}
      >
        {busy ? (
          <Loader2 size={icon} className="animate-spin" aria-hidden="true" />
        ) : (
          <MessageSquare size={icon} aria-hidden="true" />
        )}
        {label ?? t("msg.contact")}
      </button>

      {error && <p className="mt-2 text-[13px] font-bold text-danger">{error}</p>}
    </div>
  );
};

export default ContactButton;
