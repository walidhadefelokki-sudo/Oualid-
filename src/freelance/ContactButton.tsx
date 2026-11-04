import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import messaging, { OpenRequest } from "./messaging";
import { useAuth } from "./auth";
import { useI18n } from "./i18n";

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

const STYLE = {
  solid: "bg-[#173E7D] text-white",
  outline: "border-2 border-[#173E7D]/20 text-[#173E7D] hover:bg-[#173E7D]/5",
} as const;

const SIZE = {
  md: "w-full px-6 py-3",
  sm: "px-4 py-1.5 text-xs",
} as const;

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

  return (
    <div className={className}>
      <button
        onClick={open}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-bold disabled:opacity-50 ${SIZE[size]} ${STYLE[variant]}`}
      >
        {busy ? (
          <Loader2 size={size === "sm" ? 13 : 16} className="animate-spin" />
        ) : (
          <MessageSquare size={size === "sm" ? 13 : 16} />
        )}
        {label ?? t("msg.contact")}
      </button>

      {error && <p className="mt-2 text-[12px] font-semibold text-red-600">{error}</p>}
    </div>
  );
};

export default ContactButton;
