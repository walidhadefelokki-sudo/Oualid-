import React from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { I18nProvider, useI18n } from "./i18n";
import PublicLayout from "./PublicLayout";
import Home from "./pages/Home";
import Browse, { Categories } from "./pages/Browse";
import Workspace from "./pages/Workspace";
import { AuthProvider } from "./auth";

/**
 * Dar L'Emploi Freelance.
 *
 * Mounted at /freelance while the subdomain is deferred. `basename` is the
 * only line that changes when it moves to freelance.darlemploi.dz, because
 * every route below is written relative to it.
 *
 * The site tree has four areas — public, freelancer, client, admin. Only the
 * public one has pages so far. Routes for the other three are deliberately
 * absent rather than present and empty: a menu entry that opens a blank
 * dashboard is the "fake dashboard" the brief rules out, and an honest 404
 * is more useful than a shell with nothing behind it.
 */

const BASENAME = "/freelance";

const NotFound: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-display font-bold text-[#173E7D]/20">404</p>
      <h1 className="mt-4 text-2xl font-display font-bold text-[#173E7D]">
        Page introuvable
      </h1>
      <p className="mt-2 text-[#2B3442]/60">
        Cette page n'existe pas encore sur la marketplace.
      </p>
      <Link
        to="/"
        className="inline-block mt-6 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
      >
        {t("brand.freelance")}
      </Link>
    </div>
  );
};

/** Named so the routes below read as the site tree rather than as strings. */
const Services: React.FC = () => {
  const { t } = useI18n();
  return <Browse kind="services" title={t("home.popularServices")} />;
};

const Projects: React.FC = () => {
  const { t } = useI18n();
  return <Browse kind="projects" title={t("nav.projects")} />;
};

const Freelancers: React.FC = () => {
  const { t } = useI18n();
  return <Browse kind="freelancers" title={t("nav.freelancers")} />;
};

const FreelanceApp: React.FC = () => (
  <I18nProvider>
    <AuthProvider>
      <BrowserRouter basename={BASENAME}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="categories" element={<Categories />} />
            <Route path="recherche" element={<Services />} />
            <Route path="projets" element={<Projects />} />
            <Route path="freelances" element={<Freelancers />} />
            {/* The freelancer workspace. One route so far: the dashboard,
                which shows the activation form when the account has no
                profile yet. */}
            <Route path="freelance-espace" element={<Workspace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </I18nProvider>
);

export default FreelanceApp;
