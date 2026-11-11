import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, ExternalLink, Link2, MapPin } from "lucide-react";
import api from "../../services/api";
import { useI18n } from "../i18n";
import { Avatar, Badge, Loading, Price, Rating, Tint, btn } from "../ui";
import FreelancerProfile from "./FreelancerProfile";

/**
 * The published mini-portfolio at /@username.
 *
 * A freelancer who has published one gets their page; everyone else falls
 * back to the plain profile. One address either way, which is what makes it
 * worth printing on a CV — the link does not break because somebody has not
 * finished arranging their sections yet.
 *
 * This is the one screen in the charte where the serif leads: the canvas
 * sets the name in DM Serif Display at 64px and uses it again for the
 * pull-quotes. Everywhere else the serif is only the wordmark.
 *
 * The accent colour is applied through a CSS variable and inline styles
 * rather than interpolated into class names: Tailwind compiles the classes
 * it can see at build time, and a colour chosen at runtime is not one of
 * them. It is the one place in the marketplace where a colour is not a
 * token, because it belongs to the freelancer rather than to the charte.
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

/** The tints a project or service card falls back to without a cover. */
const TINTS = ["blue", "orange", "green", "purple", "yellow"] as const;

const Portfolio: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const username = handle?.replace(/^@/, "");
  const { t } = useI18n();

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

  const quotes = page.reviews.filter((r) => r.comment).slice(0, 2);

  return (
    /* White, not the marketplace ground: a portfolio is the freelancer's own
       page and the canvas gives it a clean sheet. */
    <div style={{ ["--accent" as string]: accent }} className="bg-surface">
      {/* --------------------------- the strip -------------------------- */}
      <div className="bg-ink text-[13px] text-on-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
          <span dir="ltr">
            darlemploi.dz/freelance/<b className="text-white">@{f.username}</b>
          </span>
          {/* Branding, so it goes when a plan removes branding. The handle
              above stays either way — that URL is theirs, not ours. */}
          {page.showBranding && (
            <Link to="/" className="font-bold text-white hover:underline">
              {t("portfolio.poweredBy")}{" "}
              <span className="font-serif text-[15px] font-normal">Dar L&apos;emploi</span>{" "}
              <span className="text-secondary">{t("brand.freelance")}</span>
            </Link>
          )}
        </div>
      </div>

      {/* --------------------------- the header ------------------------- */}
      {shown("HEADER") && (
        <header
          style={{
            background: page.theme.coverUrl
              ? `linear-gradient(0deg, rgba(10,17,24,0.55), rgba(10,17,24,0.55)), url(${page.theme.coverUrl}) center/cover`
              : accent,
          }}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-8 px-4 py-14 sm:gap-10 sm:px-8 sm:py-20">
            <Avatar
              name={f.displayName}
              url={f.avatarUrl}
              size="xl"
              tone="orange"
              className="shadow-[0_8px_40px_rgba(10,17,24,0.25)]"
            />

            <div className="flex min-w-0 flex-1 basis-120 flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {f.availability === "AVAILABLE" && (
                  <Badge tone="accent">{t("portfolio.available")}</Badge>
                )}
                {f.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 text-xs font-bold text-white">
                    <BadgeCheck size={13} aria-hidden="true" /> {t("service.verified")}
                  </span>
                )}
              </div>

              <h1 className="break-words font-serif text-5xl leading-none text-white sm:text-6xl">
                {f.displayName}
              </h1>

              {f.title && (
                <p className="break-words text-xl leading-snug text-white/85">{f.title}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white/85">
                {f.wilaya && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} aria-hidden="true" /> {f.wilaya}
                  </span>
                )}
                {f.rating !== null && f.ratingCount > 0 && (
                  <Rating value={f.rating} count={f.ratingCount} className="text-white" />
                )}
                <span>
                  {f.completedOrders} {t("service.orders")}
                </span>
                {f.hourlyRate && (
                  <span>
                    <Price value={f.hourlyRate} className="font-bold text-white" />
                    <span className="text-white/60"> {t("portfolio.perHour")}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2.5">
              <a href="#contact" className={btn("accent", "w-full")}>
                {t("portfolio.contactMe")}
              </a>
              {page.services.length > 0 && (
                <a
                  href="#services"
                  className={btn("ghost", "w-full border-white text-white hover:bg-white/10")}
                >
                  {t("portfolio.myServices")}
                </a>
              )}
              <button type="button" onClick={share} className={btn("quiet", "text-white/85")}>
                <Link2 size={15} aria-hidden="true" />{" "}
                {copied ? t("portfolio.copied") : t("portfolio.share")}
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-8">
        {/* ---------------------------- skills --------------------------- */}
        {shown("SKILLS") && f.skills.length > 0 && (
          <section className="flex flex-wrap gap-2.5 pt-14">
            {f.skills.map((s: string) => (
              <span
                key={s}
                className="rounded-full bg-ground px-4 py-2.5 text-sm font-bold text-primary"
              >
                {s}
              </span>
            ))}
          </section>
        )}

        {/* ----------------------------- about -------------------------- */}
        {shown("ABOUT") && f.bio && (
          <section className="pt-14">
            <h2 className="mb-5 text-3xl font-bold text-primary">{t("portfolio.about")}</h2>
            <p className="max-w-3xl whitespace-pre-wrap break-words text-lg leading-relaxed text-body">
              {f.bio}
            </p>
          </section>
        )}

        {/* --------------------------- projects ------------------------- */}
        {shown("FEATURED_PROJECTS") && page.projects.length > 0 && (
          <section className="pt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-3xl font-bold text-primary">{t("portfolio.work")}</h2>
              <span className="text-sm text-muted">
                {page.projects.length} {t("portfolio.projects")}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {page.projects.map((p, i) => (
                <article key={p.id} className="flex flex-col gap-3">
                  {p.coverUrl ? (
                    <img
                      src={p.coverUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-card object-cover"
                    />
                  ) : (
                    <Tint
                      tone={TINTS[i % TINTS.length]}
                      className="aspect-[4/3] w-full rounded-card"
                    >
                      <span className="font-serif text-4xl text-primary/30" aria-hidden="true">
                        {p.title.charAt(0).toUpperCase()}
                      </span>
                    </Tint>
                  )}

                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 break-words text-[17px] font-bold text-primary">
                      {p.title}
                    </h3>
                    {p.featured && <Badge tone="accent">{t("portfolio.featured")}</Badge>}
                  </div>

                  <p className="text-sm text-muted">
                    {[p.role, p.clientName, p.category?.name].filter(Boolean).join(" · ")}
                  </p>

                  {p.description && (
                    <p className="break-words text-sm leading-relaxed text-body">{p.description}</p>
                  )}

                  {p.tools?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.tools.map((tool: string) => (
                        <span
                          key={tool}
                          className="rounded-full bg-ground px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {(p.externalUrl || p.videoUrl) && (
                    <div className="flex flex-wrap gap-4 text-sm font-bold">
                      {p.externalUrl && (
                        <a
                          href={p.externalUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 hover:underline"
                          style={{ color: accent }}
                        >
                          <ExternalLink size={13} aria-hidden="true" /> {t("portfolio.visit")}
                        </a>
                      )}
                      {p.videoUrl && (
                        <a
                          href={p.videoUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 hover:underline"
                          style={{ color: accent }}
                        >
                          <ExternalLink size={13} aria-hidden="true" /> {t("portfolio.video")}
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* --------------------------- services ------------------------- */}
        {shown("SERVICES") && page.services.length > 0 && (
          <section id="services" className="pt-16">
            <h2 className="mb-6 text-3xl font-bold text-primary">{t("portfolio.services")}</h2>

            <div className="flex flex-col gap-3">
              {page.services.map((s, i) => (
                <Link
                  key={s.id}
                  to={`/service/${s.slug}`}
                  className="flex flex-wrap items-center gap-5 rounded-card border border-line p-5 transition-colors hover:border-primary"
                >
                  {s.coverUrl ? (
                    <img
                      src={s.coverUrl}
                      alt=""
                      className="h-18 w-18 shrink-0 rounded-chip object-cover"
                    />
                  ) : (
                    <Tint
                      tone={TINTS[i % TINTS.length]}
                      className="h-18 w-18 shrink-0 rounded-chip"
                    />
                  )}

                  <span className="flex min-w-0 flex-1 basis-80 flex-col gap-1.5">
                    <b className="break-words text-lg text-primary">{s.title}</b>
                    {s.deliveryDays && (
                      <span className="text-sm text-muted">
                        {s.deliveryDays} {t("service.days")}
                      </span>
                    )}
                  </span>

                  <span className="text-base font-bold text-primary">
                    {t("common.from")} <Price value={s.startingPrice} /> →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------- quotes -------------------------- */}
        {shown("REVIEWS") && quotes.length > 0 && (
          <section className="grid grid-cols-1 gap-5 pt-16 sm:grid-cols-2">
            {quotes.map((r) => (
              <blockquote
                key={r.id}
                className="m-0 flex flex-col gap-4 rounded-panel bg-ground p-8"
              >
                <p className="m-0 break-words font-serif text-2xl leading-snug text-primary">
                  « {r.comment} »
                </p>
                <footer className="text-sm font-bold text-primary">
                  {r.author?.firstName ?? t("portfolio.client")}
                </footer>
              </blockquote>
            ))}
          </section>
        )}

        {/* ---------------------------- contact ------------------------- */}
        {shown("CONTACT") && (
          <section
            id="contact"
            className="mt-16 flex flex-wrap items-center justify-between gap-8 rounded-bloom bg-primary p-8 sm:p-12"
          >
            <div className="flex max-w-xl flex-col gap-2.5">
              <h2 className="text-3xl font-bold text-white">{t("portfolio.workTogether")}</h2>
              <p className="text-base leading-relaxed text-on-navy">
                {t("portfolio.workTogetherLede")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/client/projets/nouveau" className={btn("accent")}>
                {t("portfolio.hireMe")}
              </Link>
              {page.services.length > 0 && (
                <Link
                  to={`/service/${page.services[0].slug}`}
                  className={btn("ghost", "border-white text-white hover:bg-white/10")}
                >
                  {t("service.order")}
                </Link>
              )}
            </div>

            {/* The phone and the e-mail are deliberately absent. The
                specification keeps them hidden, and the conversation belongs
                on the platform. */}
          </section>
        )}
      </main>
    </div>
  );
};

export default Portfolio;
