import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Coins,
  Layout,
  LayoutDashboard,
  Package,
  Send,
  Settings,
  ShoppingBag,
  UserCircle,
} from "lucide-react";
import { useAuth } from "./auth";
import { Avatar, ErrorState, Loading } from "./ui";
import SignIn from "./pages/SignIn";
import Activate from "./pages/Activate";
import { useWorkspaceStore } from "./useWorkspace";

/**
 * The freelancer workspace shell.
 *
 * Three gates, in order, because each answers a different question and the
 * later ones have no meaning until the earlier one passes:
 *
 *   signed in?  -> otherwise the sign-in screen, which returns here
 *   activated?  -> otherwise the activation form
 *   then        -> the sidebar and the section
 *
 * Every entry in the sidebar goes somewhere real. The specification lists
 * more sections than exist yet; the ones that are not built are absent
 * rather than present and dead, because a menu that opens nothing is worse
 * than a menu that is shorter.
 *
 * The header, the credit pill and the mode switch are the public shell's —
 * these routes are nested inside it, and it draws the workspace variant of
 * its bar when the path says so.
 */

const ITEMS = [
  { to: "/freelance-espace", end: true, icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/freelance-espace/services", icon: Package, label: "Mes services" },
  { to: "/freelance-espace/propositions", icon: Send, label: "Mes propositions" },
  { to: "/freelance-espace/commandes", icon: ShoppingBag, label: "Commandes" },
  { to: "/freelance-espace/credits", icon: Coins, label: "Portefeuille et crédits" },
  { to: "/freelance-espace/portfolio", icon: Layout, label: "Mini portfolio" },
  { to: "/freelance-espace/profil", icon: Settings, label: "Profil" },
];

/**
 * A sidebar row. Navy and filled when it is the section you are reading,
 * plain navy type on the ground otherwise — the canvas gives these rows no
 * card and no border.
 */
const row = ({ isActive }: { isActive: boolean }) =>
  "flex shrink-0 items-center gap-2.5 rounded-field px-3.5 py-3 text-[15px] font-semibold " +
  "transition-colors " +
  (isActive ? "bg-primary text-white" : "text-primary hover:bg-surface");

const WorkspaceLayout: React.FC = () => {
  const { signedIn, loading: authLoading } = useAuth();
  const location = useLocation();
  const { data, loading, error, reload } = useWorkspaceStore();

  if (authLoading) return <Loading />;

  // The sign-in screen is rendered in place rather than redirected to, so a
  // deep link survives the detour: sign in, and the page you asked for is
  // the page you get.
  if (!signedIn) return <SignIn />;

  if (loading) return <Loading />;

  /* A failure is shown, not waited out. This screen used to sit on
   * "Chargement…" indefinitely whenever the workspace request came back
   * without a payload, which is what a server running older code does. */
  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          message={error ?? "Impossible de charger votre espace."}
          onRetry={reload}
        />
      </div>
    );
  }

  if (!data.active) return <Activate onActivated={reload} />;

  const p = data.profile!;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row lg:gap-8">
      <aside className="lg:w-62 lg:shrink-0">
        <div className="mb-4 flex min-w-0 items-center gap-3 px-1">
          <Avatar name={p.displayName} size="md" tone="orange" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">{p.displayName}</p>
            <p className="truncate text-[11px] text-muted" dir="ltr">
              /@{p.username}
            </p>
          </div>
        </div>

        {/* Horizontally scrollable on narrow screens rather than a drawer:
            seven entries fit in a row and a drawer would hide the section
            the reader is in. */}
        <nav
          aria-label="Espace freelance"
          className="no-scrollbar flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={row}>
              <Icon size={16} aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Keyed on the path so a section always mounts fresh rather than
            briefly showing the previous one's data. */}
        <Outlet key={location.pathname} context={{ data, reload }} />
      </div>
    </div>
  );
};

export default WorkspaceLayout;
export { UserCircle, BarChart3 };
