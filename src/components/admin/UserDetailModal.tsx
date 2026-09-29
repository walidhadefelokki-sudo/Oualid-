import React, { useEffect, useState } from "react";
import { FileCheck2, FileText, Loader2, X } from "lucide-react";
import adminService, { AdminUserDetail, CvDerived } from "../../services/admin.service";

/**
 * Everything the platform holds on one account, in one panel.
 *
 * Fetched on open rather than carried in the list row: the detail includes the
 * candidate's profile, their recruiter company and their purchase history,
 * none of which belongs in a table of twenty-six accounts.
 */

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-primary/5 last:border-0">
    <span className="text-[11px] font-black uppercase tracking-widest text-primary/40 sm:w-44 shrink-0">
      {label}
    </span>
    <span className="text-sm text-primary/80 min-w-0 break-words">{children}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-6 first:mt-0">
    <h3 className="text-sm font-display text-primary mb-2">{title}</h3>
    <div className="rounded-xl border border-primary/10 bg-white px-4">{children}</div>
  </section>
);

const cvOrigin = (source: CvDerived["source"]) =>
  source === "cv-maker" ? "depuis le CV Maker" : "depuis le CV téléversé";

/**
 * A value the profile does not have, recovered from the CV.
 *
 * Always carries where it came from, so it is never mistaken for something
 * the candidate entered as a contact detail. Falls back to "—" so an empty
 * profile field with no CV behind it looks exactly as it did before.
 */
const FromCv: React.FC<{ value?: string | null; source: CvDerived["source"] }> = ({
  value,
  source,
}) =>
  value ? (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <span className="text-primary/80">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
        {cvOrigin(source)}
      </span>
    </span>
  ) : (
    <span className="text-primary/40">—</span>
  );

const money = (amount: number, currency: string) =>
  `${amount.toLocaleString("fr-FR")} ${currency.toUpperCase()}`;

const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const UserDetailModal: React.FC<{ userId: string; onClose: () => void }> = ({
  userId,
  onClose,
}) => {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getUserDetail(userId)
      .then((u) => !cancelled && setUser(u))
      .catch((e) => !cancelled && setError(e?.response?.data?.message || "Échec du chargement"));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "—"
    : "";

  const candidate = user?.candidateProfile;
  const company = user?.recruiterProfile?.companies?.[0];
  const cv = user?.cvDerived;

  /**
   * What the CV holds that the account does not.
   *
   * Only the differences are listed. Repeating an email or a name the profile
   * already carries would pad the panel without telling the admin anything,
   * and the point of this section is to surface what would otherwise be lost.
   */
  const cvExtras = !cv
    ? []
    : [
        { label: "Nom sur le CV", value: cv.fullName, skip: !cv.fullName || cv.fullName === name },
        {
          label: "E-mail",
          value: cv.email,
          skip: !cv.email || cv.email.toLowerCase() === user?.email?.toLowerCase(),
        },
        { label: "Adresse", value: cv.address, skip: !cv.address || Boolean(candidate?.city) },
        { label: "LinkedIn", value: cv.linkedin, skip: !cv.linkedin || Boolean(candidate?.linkedinUrl) },
        {
          label: "Portfolio",
          value: cv.portfolio,
          skip: !cv.portfolio || Boolean(candidate?.portfolioUrl),
        },
        { label: "Profil", value: cv.summary, skip: !cv.summary },
      ].filter((e): e is { label: string; value: string; skip: boolean } => !e.skip && Boolean(e.value));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-accent rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 bg-primary text-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-display break-words">{name || "Compte"}</h2>
            {user && <p className="text-white/60 text-sm break-all">{user.email}</p>}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-white/70 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
          {error ? (
            <p className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm p-3">{error}</p>
          ) : !user ? (
            <div className="py-12 flex items-center justify-center gap-3 text-primary/50">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-semibold">Chargement…</span>
            </div>
          ) : (
            <>
              <Section title="Compte">
                <Row label="Rôle">{user.role}</Row>
                <Row label="Statut">{user.status}</Row>
                <Row label="Téléphone">
                  {user.phone || (cv ? <FromCv value={cv.phone} source={cv.source} /> : "—")}
                </Row>
                <Row label="Inscrit le">{date(user.createdAt)}</Row>
                <Row label="Modifié le">{date(user.updatedAt)}</Row>
                {user.deletedAt && <Row label="Supprimé le">{date(user.deletedAt)}</Row>}
                <Row label="Identifiant">
                  <code className="text-[11px] text-primary/50">{user.id}</code>
                </Row>
              </Section>

              {candidate && (
                <>
                  <Section title="Profil candidat">
                    <Row label="Métier">
                      {candidate.currentJobTitle ||
                        (cv ? <FromCv value={cv.title} source={cv.source} /> : "—")}
                    </Row>
                    <Row label="Titre">{candidate.headline || "—"}</Row>
                    <Row label="Wilaya">{candidate.wilaya || "—"}</Row>
                    <Row label="Ville">{candidate.city || "—"}</Row>
                    <Row label="Expérience">
                      {candidate.yearsExperience != null ? `${candidate.yearsExperience} an(s)` : "—"}
                    </Row>
                    <Row label="Compétences">
                      {candidate.skills?.length ? (
                        candidate.skills.join(", ")
                      ) : cv?.skills?.length ? (
                        <FromCv value={cv.skills.join(", ")} source={cv.source} />
                      ) : (
                        "—"
                      )}
                    </Row>
                    <Row label="Disponible">{candidate.availableImmediately ? "Oui" : "Non"}</Row>
                    <Row label="Candidatures">{candidate._count?.applications ?? 0}</Row>
                  </Section>

                  <Section title="CV">
                    <Row label="Téléversé">
                      {candidate.hasUploadedCv ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                          <FileCheck2 size={14} /> Oui
                          {candidate.resume?.url && (
                            <a
                              href={candidate.resume.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-primary ml-1"
                            >
                              ouvrir
                            </a>
                          )}
                        </span>
                      ) : (
                        <span className="text-primary/40">Non</span>
                      )}
                    </Row>
                    <Row label="CV Maker">
                      {candidate.hasBuiltCv ? (
                        <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
                          <FileText size={14} /> Oui
                        </span>
                      ) : (
                        <span className="text-primary/40">Non</span>
                      )}
                    </Row>
                    <Row label="Liens">
                      {[candidate.linkedinUrl, candidate.githubUrl, candidate.portfolioUrl]
                        .filter(Boolean)
                        .map((url) => (
                          <a
                            key={url as string}
                            href={url as string}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-primary mr-3 break-all"
                          >
                            {url}
                          </a>
                        )) || "—"}
                      {![candidate.linkedinUrl, candidate.githubUrl, candidate.portfolioUrl].some(Boolean) &&
                        "—"}
                    </Row>
                  </Section>

                  {cvExtras.length > 0 && (
                    <Section title={`Lu dans le CV · ${cvOrigin(cv!.source)}`}>
                      {cvExtras.map(({ label, value }) => (
                        <Row key={label} label={label}>
                          <span className="text-primary/80">{value}</span>
                        </Row>
                      ))}
                    </Section>
                  )}
                </>
              )}

              {company && (
                <Section title="Entreprise">
                  <Row label="Nom">{company.company.name}</Row>
                  <Row label="Rôle">{company.role}</Row>
                  <Row label="Plan">{company.company.plan}</Row>
                  <Row label="Annonces restantes">{company.company.postingCredits}</Row>
                  <Row label="Offres publiées">{company.company._count.jobs}</Row>
                  <Row label="Vérifiée">{company.company.verified ? "Oui" : "Non"}</Row>
                </Section>
              )}

              <Section title={`Achats (${user.orders.length})`}>
                {user.orders.length === 0 ? (
                  <Row label="—">Aucun achat</Row>
                ) : (
                  user.orders.map((o) => (
                    <Row key={o.id} label={o.invoiceNumber || o.status}>
                      {o.jobs} annonce(s) · {money(o.amount, o.currency)} · {date(o.paidAt || o.createdAt)}
                      {o.status !== "PAID" && (
                        <span className="ml-2 text-[11px] uppercase tracking-widest text-amber-600">
                          {o.status}
                        </span>
                      )}
                    </Row>
                  ))
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
