import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, ExternalLink, Link2, MapPin, QrCode, Star } from "lucide-react";
import api from "../../services/api";
import { Loading, Price } from "../ui";
import FreelancerProfile from "./FreelancerProfile";

/**
 * The published mini-portfolio at /@username.
 *
 * A freelancer who has published one gets their page; everyone else falls
 * back to the plain profile. One address either way, which is what makes it
 * worth printing on a CV — the link does not break because somebody has not
 * finished arranging their sections yet.
 *
 * The accent colour is applied through a CSS variable rather than
 * interpolated into class names: Tailwind compiles the classes it can see at
 * build time, and a colour chosen at runtime is not one of them.
 */

interface Page {
  freelancer: any;
  theme: {
    template: string;
    accentColor: string;
    fontFamily: string;
    defaultLanguage: string;
    coverUrl: string | null;
  };
  seo: { title: string | null; description: string | null };
  sections: Array<{ type: string; visible: boolean; content: unknown }>;
  projects: any[];
  services: any[];
  reviews: any[];
  showBranding: boolean;
}

const Portfolio: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const username = handle?.replace(/^@/, "");

  const [page, setPage] = useState<Page | null>(null);
  const [state, setState] = useState<"loading" | "portfolio" | "profile">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/freelance/portfolio/${username}`)
      .then((r) => {
        if (cancelled) return;
        setPage(r.data.data);
        setState("portfolio");
      })
      .catch(() => !cancelled && setState("profile"));
    return () => {
      cancelled = true;
    };
  }, [username]);

  /* The page title and description belong to the portfolio, so they are set
   * here. Real server-rendered metadata needs SSR, which this SPA does not
   * have — noted rather than pretended. */
  useEffect(() => {
    if (!page) return;
    const previous = document.title;
    document.title = page.seo.title || `${page.freelancer.displayName} — Dar L'emploi`;
    return () => {
      document.title = previous;
    };
  }, [page]);

  if (state === "loading") return <Loading />;
  if (state === "profile" || !page) return <FreelancerProfile />;

  const f = page.freelancer;
  const accent = page.theme.accentColor;
  const shown = (type: string) => page.sections.find((s) => s.type === type)?.visible !== false;

  const share = async () => {
    const url = `${window.location.origin}/freelance/@${f.username}`;
    try {
      if (navigator.share) await navigator.share({ title: f.displayName, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Dismissed, or no permission. Nothing to report.
    }
  };

  return (
    <div style={{ ["--accent" as string]: accent }} className="pb-16">
      {shown("HEADER") && (
        <header className="relative">
          <div
            className="h-40 sm:h-56 w-full"
            style={{
              background: page.theme.coverUrl
                ? `url(${page.theme.coverUrl}) center/cover`
                : `linear-gradient(135deg, ${accent}, #0B1E3D)`,
            }}
          />

          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="-mt-14 flex flex-col sm:flex-row sm:items-end gap-4">
              {f.avatarUrl ? (
                <img
                  src={f.avatarUrl}
                  alt=""
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <span
                  className="w-28 h-28 rounded-2xl grid place-items-center text-white font-display text-4xl border-4 border-white shadow-lg"
                  style={{ background: accent }}
                >
                  {f.displayName.charAt(0).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 flex-1 sm:pb-2">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#173E7D] inline-flex items-center gap-2 break-words">
                  {f.displayName}
                  {f.verified && <BadgeCheck size={22} style={{ color: accent }} />}
                </h1>
                {f.title && <p className="text-[#2B3442]/70 break-words">{f.title}</p>}
              </div>

              <button
                onClick={share}
                className="shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white sm:mb-2"
                style={{ background: accent }}
              >
                <Link2 size={15} /> {copied ? "Lien copié" : "Partager"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#2B3442]/60">
              {f.rating !== null && f.ratingCount > 0 && (
                <span dir="ltr" className="inline-flex items-center gap-1 font-bold text-[#B8860B]">
                  <Star size={14} fill="currentColor" />
                  {Number(f.rating).toFixed(1)}
                  <span className="font-semibold text-[#2B3442]/40">({f.ratingCount})</span>
                </span>
              )}
              <span>{f.completedOrders} mission(s) terminée(s)</span>
              {f.wilaya && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} /> {f.wilaya}
                </span>
              )}
              {f.hourlyRate && (
                <span>
                  <Price value={f.hourlyRate} />
                  <span className="text-[#2B3442]/40"> / heure</span>
                </span>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 mt-8">
        {shown("ABOUT") && f.bio && (
          <section>
            <h2 className="text-lg font-display font-bold mb-2" style={{ color: accent }}>
              À propos
            </h2>
            <p className="text-[#2B3442]/80 whitespace-pre-wrap break-words leading-relaxed">
              {f.bio}
            </p>
          </section>
        )}

        {shown("SKILLS") && f.skills.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-bold mb-3" style={{ color: accent }}>
              Compétences
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {f.skills.map((s: string) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                  style={{ background: accent }}
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {shown("FEATURED_PROJECTS") && page.projects.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-bold mb-3" style={{ color: accent }}>
              Réalisations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {page.projects.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border-2 border-[#173E7D]/10 bg-white overflow-hidden"
                >
                  {p.coverUrl ? (
                    <img src={p.coverUrl} alt="" className="w-full aspect-[16/10] object-cover" />
                  ) : (
                    <div
                      className="w-full aspect-[16/10] opacity-10"
                      style={{ background: accent }}
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <h3 className="font-bold text-[#173E7D] flex-1 break-words">{p.title}</h3>
                      {p.featured && (
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white shrink-0"
                          style={{ background: accent }}
                        >
                          À la une
                        </span>
                      )}
                    </div>

                    {p.description && (
                      <p className="mt-2 text-sm text-[#2B3442]/70 break-words">{p.description}</p>
                    )}

                    <p className="mt-2 text-xs text-[#2B3442]/50">
                      {[p.role, p.clientName, p.category?.name].filter(Boolean).join(" · ")}
                    </p>

                    {p.tools?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tools.map((t: string) => (
                          <span
                            key={t}
                            className="text-[11px] px-2 py-0.5 rounded bg-[#173E7D]/8 text-[#173E7D]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {(p.externalUrl || p.videoUrl) && (
                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        {p.externalUrl && (
                          <a
                            href={p.externalUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1.5 font-bold"
                            style={{ color: accent }}
                          >
                            <ExternalLink size={13} /> Voir
                          </a>
                        )}
                        {p.videoUrl && (
                          <a
                            href={p.videoUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1.5 font-bold"
                            style={{ color: accent }}
                          >
                            <ExternalLink size={13} /> Vidéo
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {shown("SERVICES") && page.services.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-bold mb-3" style={{ color: accent }}>
              Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {page.services.map((s) => (
                <Link
                  key={s.id}
                  to={`/service/${s.slug}`}
                  className="rounded-2xl border-2 border-[#173E7D]/10 bg-white p-4 hover:border-[#173E7D]/30 transition-colors"
                >
                  <p className="font-bold text-[#173E7D] break-words">{s.title}</p>
                  <p className="mt-2 text-sm">
                    <span className="text-[#2B3442]/50">À partir de </span>
                    <Price value={s.startingPrice} />
                  </p>
                  <span
                    className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold text-white"
                    style={{ background: accent }}
                  >
                    Commander
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {shown("REVIEWS") && page.reviews.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-bold mb-3" style={{ color: accent }}>
              Avis
            </h2>
            <div className="space-y-3">
              {page.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border-2 border-[#173E7D]/10 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span dir="ltr" className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={13}
                          className={n <= r.rating ? "text-[#D4AF37]" : "text-[#173E7D]/15"}
                          fill={n <= r.rating ? "currentColor" : "none"}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-semibold">{r.author?.firstName ?? "Client"}</span>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-[#2B3442]/70 break-words">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {shown("CONTACT") && (
          <section className="rounded-2xl p-6 text-center text-white" style={{ background: accent }}>
            <h2 className="text-lg font-display font-bold">Travaillons ensemble</h2>
            <p className="mt-1 text-white/80 text-sm">
              Commandez un service ou invitez {f.displayName} sur votre projet.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                to="/client/projets/nouveau"
                className="rounded-full px-6 py-2.5 bg-white font-bold text-sm"
                style={{ color: accent }}
              >
                Me recruter
              </Link>
              {page.services.length > 0 && (
                <Link
                  to={`/service/${page.services[0].slug}`}
                  className="rounded-full px-6 py-2.5 border border-white/50 font-bold text-sm"
                >
                  Commander un service
                </Link>
              )}
            </div>
            {/* The phone and the e-mail are deliberately absent. The
                specification keeps them hidden, and the conversation belongs
                on the platform. */}
          </section>
        )}

        {page.showBranding && (
          <p className="text-center text-xs text-[#2B3442]/40 pt-4">
            Réalisé avec{" "}
            <a href="/freelance" className="font-bold text-[#173E7D]">
              Dar L'emploi
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
