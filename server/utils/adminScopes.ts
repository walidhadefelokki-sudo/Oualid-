/**
 * What a limited administrator may be given.
 *
 * `restrictTo("ADMIN")` was the only check on the whole admin surface, so
 * every administrator could do everything: change anyone's role, delete
 * accounts, grant annonce credits, approve transfers, mail the entire
 * database. There was no way to hand somebody the moderation queue without
 * handing them that too.
 *
 * One list, shared by the middleware that enforces it, the endpoint that
 * grants it and the sidebar that hides what you cannot reach. A screen added
 * without a scope here is a screen no limited administrator can open, which
 * is the right way for that mistake to go.
 */

export const ADMIN_SCOPES = [
  "overview",
  "plans",
  "payments",
  "users",
  "jobs",
  "schedules",
  "emails",
  "crm",
  "preselection",
  "freelance_moderation",
  "team_tasks",
] as const;

export type AdminScope = (typeof ADMIN_SCOPES)[number];

/** What each one is called on screen, and what it actually lets someone do. */
export const SCOPE_LABELS: Record<AdminScope, { label: string; description: string }> = {
  overview: {
    label: "Aperçu",
    description: "Les chiffres de la plateforme.",
  },
  plans: {
    label: "Plans recruteurs",
    description:
      "Changer le plan d'une entreprise et créditer des packs d'annonces. Touche à ce qui a été payé.",
  },
  payments: {
    label: "Paiements",
    description: "Consulter tous les paiements. Lecture seule.",
  },
  users: {
    label: "Comptes",
    description:
      "Voir, modifier, suspendre et supprimer des comptes. Ne permet jamais de créer un administrateur.",
  },
  jobs: {
    label: "Offres",
    description: "Modifier et supprimer les offres d'emploi.",
  },
  schedules: {
    label: "Agenda",
    description: "L'agenda de l'équipe.",
  },
  emails: {
    label: "E-mails groupés",
    description:
      "Écrire à des milliers de comptes d'un seul envoi. À n'accorder qu'en connaissance de cause.",
  },
  crm: {
    label: "CRM",
    description: "Les prospects et leurs notes.",
  },
  preselection: {
    label: "Présélection Corporate",
    description: "Décider à la place d'un recruteur Corporate.",
  },
  freelance_moderation: {
    label: "Modération freelance",
    description:
      "Valider services et projets, lire les messages signalés, et approuver les virements — ce qui accorde des crédits.",
  },
  team_tasks: {
    label: "Tâches d'équipe",
    description: "Le tableau des tâches internes.",
  },
};

const VALID = new Set<string>(ADMIN_SCOPES);

export const isAdminScope = (value: unknown): value is AdminScope =>
  typeof value === "string" && VALID.has(value);

/**
 * Cleans a list of scopes coming from a request.
 *
 * Unknown values are dropped rather than refused: the only thing that could
 * send one is a client built against a newer or older list, and a silently
 * narrower grant is safer than a rejected request that leaves the previous,
 * possibly wider, grant in place.
 */
export const normaliseScopes = (value: unknown): AdminScope[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isAdminScope))];
};

/** Whether this account may use one area. */
export const canUseScope = (
  user: { role?: string; isSuperAdmin?: boolean; adminScopes?: string[] } | null | undefined,
  scope: AdminScope
): boolean => {
  if (!user || user.role !== "ADMIN") return false;
  if (user.isSuperAdmin) return true;
  return Array.isArray(user.adminScopes) && user.adminScopes.includes(scope);
};
