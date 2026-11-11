import React from "react";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { I18nProvider, useI18n } from "./i18n";
import { AuthProvider, useAuth } from "./auth";
import { WorkspaceProvider } from "./useWorkspace";
import { btn } from "./ui";
import PublicLayout from "./PublicLayout";
import WorkspaceLayout from "./WorkspaceLayout";
import Home from "./pages/Home";
import Browse, { Categories } from "./pages/Browse";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import Overview from "./pages/workspace/Overview";
import ServiceEditor from "./pages/workspace/ServiceEditor";
import OrderDetail from "./pages/workspace/OrderDetail";
import MyProjects from "./pages/client/MyProjects";
import ProjectEditor from "./pages/client/ProjectEditor";
import ProjectDetail from "./pages/ProjectDetail";
import ServiceDetail from "./pages/ServiceDetail";
import FreelancerProfile from "./pages/FreelancerProfile";
import Portfolio from "./pages/Portfolio";
import PortfolioEditor from "./pages/workspace/PortfolioEditor";
import Pricing from "./pages/Pricing";
import BuyCredits from "./pages/BuyCredits";
import PaymentStatus from "./pages/PaymentStatus";
import Messages from "./pages/Messages";
import {
  MyCredits,
  MyOrders,
  MyProfile,
  MyProposals,
  MyServices,
} from "./pages/workspace/Sections";

/**
 * Dar L'Emploi Freelance.
 *
 * Mounted at /freelance while the subdomain is deferred. `basename` is the
 * only line that changes when it moves to freelance.darlemploi.dz, because
 * every route below is written relative to it.
 *
 * The site tree has four areas — public, freelancer, client, admin. The
 * first two have pages. Routes for the client and admin areas are
 * deliberately absent rather than present and empty: a menu entry that opens
 * a blank dashboard is the fake dashboard the brief rules out, and an honest
 * 404 is more useful than a shell with nothing behind it.
 */

const BASENAME = "/freelance";

const NotFound: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="font-serif text-7xl text-primary/25">404</p>
      <h1 className="mt-4 text-2xl font-bold text-primary">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n&apos;existe pas encore sur la marketplace.</p>
      <Link to="/" className={btn("primary", "mt-7")}>
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

const HandleRoute: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  // The portfolio when one is published, the plain profile otherwise. One
  // address either way, which is what makes it worth printing on a CV.
  return handle?.startsWith("@") ? <Portfolio /> : <NotFound />;
};

/**
 * Inside AuthProvider, so the workspace store knows whether to load at all.
 * Separate component only because a provider cannot read the context of a
 * provider declared in the same element.
 */
const Shell: React.FC = () => {
  const { signedIn } = useAuth();

  return (
    <WorkspaceProvider enabled={signedIn}>
      <BrowserRouter basename={BASENAME}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="categories" element={<Categories />} />
            <Route path="recherche" element={<Services />} />
            <Route path="projets" element={<Projects />} />
            <Route path="freelances" element={<Freelancers />} />
            <Route path="projet/:slug" element={<ProjectDetail />} />
            <Route path="service/:slug" element={<ServiceDetail />} />
            <Route path="tarifs" element={<Pricing />} />
            <Route path="acheter-credits" element={<BuyCredits />} />
            <Route path="paiement/:id" element={<PaymentStatus />} />

            {/* Messages. Outside the workspace on purpose: that shell gates
                on an activated freelance profile, and a client who posted a
                project has none — they would be shown the activation form to
                read their own replies. Both sides need the same inbox. */}
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:id" element={<Messages />} />
            {/* The handle lives at the root, as the specification sets out:
                freelance.darlemploi.dz/@nom-utilisateur. */}
            <Route path=":handle" element={<HandleRoute />} />

            <Route path="connexion" element={<SignIn mode="signin" />} />
            <Route path="inscription" element={<SignIn mode="signup" />} />
            {/* Google returns here, not to the recruitment app's callback. */}
            <Route path="auth/callback" element={<AuthCallback />} />

            {/* The workspace gates on signed-in, then on activated, before
                any section renders. */}
            <Route path="freelance-espace" element={<WorkspaceLayout />}>
              <Route index element={<Overview />} />
              <Route path="services" element={<MyServices />} />
              <Route path="services/nouveau" element={<ServiceEditor />} />
              <Route path="services/:id" element={<ServiceEditor />} />
              <Route path="propositions" element={<MyProposals />} />
              <Route path="commandes" element={<MyOrders />} />
              <Route path="commandes/:id" element={<OrderDetail />} />
              <Route path="credits" element={<MyCredits />} />
              <Route path="profil" element={<MyProfile />} />
              <Route path="portfolio" element={<PortfolioEditor />} />
            </Route>

            {/* Client area. Free, and needing no profile to activate:
                posting work takes nothing but an account. */}
            <Route path="client/projets" element={<MyProjects />} />
            <Route path="client/projets/nouveau" element={<ProjectEditor />} />
            <Route path="client/projets/:id" element={<ProjectEditor />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WorkspaceProvider>
  );
};

const FreelanceApp: React.FC = () => (
  <I18nProvider>
    <AuthProvider>
      <Shell />
    </AuthProvider>
  </I18nProvider>
);

export default FreelanceApp;
