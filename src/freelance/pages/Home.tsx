import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useI18n } from "../i18n";
import { WILAYAS } from "../../constants";
import freelanceService, {
  FreelancerCard,
  MarketplaceCategory,
  ProjectCard,
  ServiceCard,
} from "../freelance.service";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  FreelancerTile,
  Grid,
  Loading,
  ProjectTile,
  Section,
  ServiceTile,
  Wrap,
  btn,
} from "../ui";

/**
 * The marketplace home page.
 *
 * Every section reads from the database. Nothing here is a placeholder
 * number: the brief forbids invented ratings, prices, user counts and
 * success statistics, and this marketplace has not launched, so the honest
 * rendering of most sections today is a deliberate empty state.
 *
 * The same goes for the hero's showcase card — it is the first real service
 * or nothing at all. An empty marketplace showing a specimen listing is the
 * one thing a visitor would be entitled to feel misled about.
 */

/** The four searches the canvas puts under the hero. Each is a real query. */
const POPULAR = [
  "Site WordPress",
  "Identité visuelle",
  "Traduction FR ↔ AR",
  "Community management",
];

/** The tints cycle so a row of categories is not one flat colour. */
const TINTS = ["bg-tint-blue", "bg-tint-orange", "bg-tint-green", "bg-tint-purple"];

const Home: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [wilaya, setWilaya] = useState("");

  const [categories, setCategories] = useState<MarketplaceCategory[] | null>(null);
  const [services, setServices] = useState<ServiceCard[] | null>(null);
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [freelancers, setFreelancers] = useState<FreelancerCard[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    Promise.all([
      freelanceService.getCategories(),
      freelanceService.getServices({ limit: 8 }),
      freelanceService.getProjects({ limit: 6 }),
      freelanceService.getFreelancers({ limit: 8 }),
    ])
      .then(([c, s, p, f]) => {
        setCategories(c);
        setServices(s.items);
        setProjects(p.items);
        setFreelancers(f.items);
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const q = query.trim();
    if (q) params.set("q", q);
    if (wilaya) params.set("wilaya", wilaya);
    const qs = params.toString();
    navigate(qs ? `/recherche?${qs}` : "/recherche");
  };

  /* The hero's showcase. Shown only when there is a real service to show. */
  const showcase = services?.[0];

  return (
    <>
      {/* ------------------------------- hero ------------------------------ */}
      <Wrap className="pt-6 sm:pt-8">
        <div className="flex flex-wrap items-center gap-10 rounded-bloom bg-primary p-7 sm:p-14">
          <div className="flex min-w-0 flex-1 basis-130 flex-col gap-6">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-secondary">
              {t("home.eyebrow")}
            </p>

            <h1 className="text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
              {t("home.heroTitle")} <span className="text-secondary">{t("home.heroAccent")}</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-on-navy">{t("home.heroLede")}</p>

            <form
              onSubmit={search}
              className="flex flex-wrap gap-2 rounded-tile bg-surface p-2"
              role="search"
            >
              <label className="flex min-w-0 flex-1 basis-70 items-center gap-2.5 px-3">
                <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
                <span className="sr-only">{t("home.searchLabel")}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="w-full border-0 bg-transparent py-3.5 text-base text-primary outline-none placeholder:text-muted"
                />
              </label>

              <label className="flex items-center border-line px-3 sm:border-s">
                <span className="sr-only">{t("home.wilaya")}</span>
                <select
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  className="max-w-40 border-0 bg-transparent py-3 text-[15px] text-primary outline-none"
                >
                  <option value="">{t("home.allWilayas")}</option>
                  {WILAYAS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className={btn("accent", "grow sm:grow-0")}>
                {t("home.search")}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-on-navy">{t("home.popular")}</span>
              {POPULAR.map((p) => (
                <Link
                  key={p}
                  to={`/recherche?q=${encodeURIComponent(p)}`}
                  className="rounded-full border border-on-navy-line px-3.5 py-2 text-sm text-white hover:bg-white/10"
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>

          {showcase && (
            <div className="min-w-0 flex-1 basis-90">
              <ServiceTile service={showcase} />
            </div>
          )}
        </div>
      </Wrap>

      {failed ? (
        <Wrap className="py-12">
          <ErrorState onRetry={load} />
        </Wrap>
      ) : (
        <>
          {/* ---------------------------- categories --------------------- */}
          <Section
            title={t("home.exploreCategories")}
            action={{ to: "/categories", label: t("home.allCategories") }}
          >
            {categories === null ? (
              <Loading />
            ) : categories.length === 0 ? (
              <EmptyState message={t("empty.categories")} />
            ) : (
              <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((c, i) => (
                  <Link
                    key={c.id}
                    to={`/recherche?category=${c.slug}`}
                    className="flex min-h-24 items-center gap-4 rounded-tile bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(23,62,125,0.10)]"
                  >
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-chip text-base font-bold text-primary ${
                        TINTS[i % TINTS.length]
                      }`}
                      aria-hidden="true"
                    >
                      {c.icon || c.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="break-words font-bold text-primary">{c.name}</span>
                      <span className="truncate text-[13px] text-muted">
                        {c.subcategories.length > 0
                          ? c.subcategories
                              .slice(0, 3)
                              .map((s) => s.name)
                              .join(", ")
                          : `${c.serviceCount} ${t("home.servicesCount")}`}
                      </span>
                    </span>
                  </Link>
                ))}
              </Grid>
            )}
          </Section>

          {/* ------------------------- featured services ----------------- */}
          <Section
            title={t("home.featured")}
            lede={t("home.featuredLede")}
            action={{ to: "/recherche", label: t("home.allServices") }}
          >
            {services === null ? (
              <Loading />
            ) : services.length === 0 ? (
              <EmptyState message={t("empty.services")} />
            ) : (
              <Grid>
                {services.map((s) => (
                  <ServiceTile key={s.id} service={s} />
                ))}
              </Grid>
            )}
          </Section>

          {/* ---------------------------- projects ----------------------- */}
          <Section
            title={t("home.featuredProjects")}
            action={{ to: "/projets", label: t("home.allProjects") }}
          >
            {projects === null ? (
              <Loading />
            ) : projects.length === 0 ? (
              <EmptyState message={t("empty.projects")} />
            ) : (
              <Grid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <ProjectTile key={p.id} project={p} />
                ))}
              </Grid>
            )}
          </Section>

          {/* --------------------------- freelancers --------------------- */}
          <Section
            title={t("home.recommendedFreelancers")}
            action={{ to: "/freelances", label: t("common.seeAll") }}
          >
            {freelancers === null ? (
              <Loading />
            ) : freelancers.length === 0 ? (
              <EmptyState message={t("empty.freelancers")} />
            ) : (
              <Grid>
                {freelancers.map((f) => (
                  <FreelancerTile key={f.username} freelancer={f} />
                ))}
              </Grid>
            )}
          </Section>
        </>
      )}

      {/* ------------------------- how it works ------------------------- */}
      <Section title={t("home.howItWorks")}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <HowTo
            title={t("home.youAreClient")}
            badge={{ tone: "success", label: t("home.clientFree") }}
            tint="bg-tint-blue"
            steps={[
              [t("home.client1"), t("home.client1rest")],
              [t("home.client2"), t("home.client2rest")],
              [t("home.client3"), t("home.client3rest")],
            ]}
            cta={{ to: "/client/projets/nouveau", label: t("home.ctaFree"), tone: "primary" }}
          />
          <HowTo
            title={t("home.youAreFreelancer")}
            badge={{ tone: "warn", label: t("home.freelancePaid") }}
            tint="bg-tint-orange"
            steps={[
              [t("home.freelancer1"), t("home.freelancer1rest")],
              [t("home.freelancer2"), t("home.freelancer2rest")],
              [t("home.freelancer3"), t("home.freelancer3rest")],
            ]}
            cta={{ to: "/tarifs", label: t("home.seePricing"), tone: "accent" }}
          />
        </div>
      </Section>

      {/* -------------------------- closing band ------------------------- */}
      <Wrap className="pt-12 sm:pt-16">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-hero bg-secondary p-8 sm:p-12">
          <div className="flex max-w-xl flex-col gap-2.5">
            <h2 className="text-3xl font-bold text-ink">{t("home.bandTitle")}</h2>
            <p className="text-[17px] leading-relaxed text-ink/80">{t("home.bandLede")}</p>
          </div>
          <Link
            to="/freelance-espace"
            className={btn("primary", "bg-ink hover:bg-ink/85 px-6 py-4 text-base")}
          >
            {t("home.becomeFreelancer")}
          </Link>
        </div>
      </Wrap>
    </>
  );
};

/**
 * One of the two "comment ça marche" cards.
 *
 * A real `<ol>`, so the steps are a numbered list to a screen reader too and
 * not three paragraphs that happen to start with a circled digit.
 */
const HowTo: React.FC<{
  title: string;
  badge: { tone: "success" | "warn"; label: string };
  tint: string;
  steps: Array<[string, string]>;
  cta: { to: string; label: string; tone: "primary" | "accent" };
}> = ({ title, badge, tint, steps, cta }) => (
  <Card className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-2xl font-bold text-primary">{title}</h3>
      <Badge tone={badge.tone}>{badge.label}</Badge>
    </div>

    <ol className="flex list-none flex-col gap-4 p-0">
      {steps.map(([lead, rest], i) => (
        <li key={lead} className="flex gap-3.5">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold text-primary ${tint}`}
          >
            {i + 1}
          </span>
          <span className="text-base leading-relaxed text-body">
            <b className="text-primary">{lead}</b>
            {rest}
          </span>
        </li>
      ))}
    </ol>

    <Link to={cta.to} className={btn(cta.tone, "mt-auto self-start")}>
      {cta.label}
    </Link>
  </Card>
);

export default Home;
