import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useI18n } from "../i18n";
import freelanceService, {
  FreelancerCard,
  MarketplaceCategory,
  ProjectCard,
  ServiceCard,
} from "../freelance.service";
import {
  EmptyState,
  ErrorState,
  FreelancerTile,
  Grid,
  Loading,
  ProjectTile,
  Section,
  ServiceTile,
} from "../ui";

/**
 * The marketplace home page.
 *
 * Every section reads from the database. Nothing here is a placeholder
 * number: the brief forbids invented ratings, prices, user counts and
 * success statistics, and this marketplace has not launched, so the honest
 * rendering of most sections today is a deliberate empty state.
 */
const Home: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

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

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : "/recherche");
  };

  return (
    <>
      <div className="bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-display font-bold leading-tight max-w-3xl mx-auto break-words">
            {t("home.title")}
          </h1>
          <p className="mt-4 text-white/70 max-w-2xl mx-auto">{t("home.subtitle")}</p>

          <form
            onSubmit={submitSearch}
            className="mt-8 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute top-1/2 -translate-y-1/2 start-4 text-[#173E7D]/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("home.searchPlaceholder")}
                aria-label={t("home.searchPlaceholder")}
                className="w-full rounded-full ps-12 pe-5 py-3.5 text-[#2B3442] outline-none bg-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-full px-8 py-3.5 bg-[#D4AF37] text-[#0B1E3D] font-bold hover:bg-[#F0D989] transition-colors"
            >
              {t("home.search")}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/freelance-espace/services/nouveau"
              className="rounded-full px-5 py-2.5 border border-white/30 text-sm font-bold hover:bg-white/10"
            >
              {t("home.ctaPublishService")}
            </Link>
            <Link
              to="/client/projets/nouveau"
              className="rounded-full px-5 py-2.5 border border-white/30 text-sm font-bold hover:bg-white/10"
            >
              {t("home.ctaPostProject")}
            </Link>
          </div>
        </div>
      </div>

      {failed ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <ErrorState onRetry={load} />
        </div>
      ) : (
        <>
          <Section title={t("home.categories")} action={{ to: "/categories", label: t("common.seeAll") }}>
            {categories === null ? (
              <Loading />
            ) : categories.length === 0 ? (
              <EmptyState message={t("empty.categories")} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/categories/${c.slug}`}
                    className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5 hover:border-[#173E7D]/40 hover:shadow-lg transition-all"
                  >
                    <span className="block font-bold text-[#173E7D] break-words">{c.name}</span>
                    <span className="block mt-1 text-xs text-[#2B3442]/50">
                      {c.serviceCount}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section
            title={t("home.popularServices")}
            action={{ to: "/recherche", label: t("common.seeAll") }}
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

          <Section
            title={t("home.featuredProjects")}
            action={{ to: "/projets", label: t("common.seeAll") }}
          >
            {projects === null ? (
              <Loading />
            ) : projects.length === 0 ? (
              <EmptyState message={t("empty.projects")} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((p) => (
                  <ProjectTile key={p.id} project={p} />
                ))}
              </div>
            )}
          </Section>

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
    </>
  );
};

export default Home;
