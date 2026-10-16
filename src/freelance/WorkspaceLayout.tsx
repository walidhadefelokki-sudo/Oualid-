import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Coins,
  LayoutDashboard,
  Package,
  Send,
  Settings,
  ShoppingBag,
  UserCircle,
} from "lucide-react";
import { useAuth } from "./auth";
import { Loading } from "./ui";
import SignIn from "./pages/SignIn";
import Activate from "./pages/Activate";
import { useWorkspace } from "./useWorkspace";

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
 */

const ITEMS = [
  { to: "/freelance-espace", end: true, icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/freelance-espace/services", icon: Package, label: "Mes services" },
  { to: "/freelance-espace/propositions", icon: Send, label: "Mes propositions" },
  { to: "/freelance-espace/commandes", icon: ShoppingBag, label: "Commandes" },
  { to: "/freelance-espace/credits", icon: Coins, label: "Crédits" },
  { to: "/freelance-espace/profil", icon: Settings, label: "Profil" },
];

const WorkspaceLayout: React.FC = () => {
  const { signedIn, loading: authLoading } = useAuth();
  const location = useLocation();
  const { data, loading, error, reload } = useWorkspace(signedIn);

  if (authLoading) return <Loading />;

  // The sign-in screen is rendered in place rather than redirected to, so a
  // deep link survives the detour: sign in, and the page you asked for is
  // the page you get.
  if (!signedIn) {
    return <SignIn />;
  }

  if (loading) return <Loading />;

  /* A failure is shown, not waited out. This screen used to sit on
   * "Chargement…" indefinitely whenever the workspace request came back
   * without a payload, which is what a server running older code does. */
  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-bold text-red-700">Impossible de charger votre espace</p>
          <p className="mt-2 text-sm text-red-600 break-words">
            {error ?? "Réponse inattendue du serveur."}
          </p>
          <button
            onClick={reload}
            className="mt-5 rounded-full px-6 py-2.5 bg-[#173E7D] text-white text-sm font-bold"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data.active) return <Activate onActivated={reload} />;

  const p = data.profile!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-60 shrink-0">
          <div className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-4 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display shrink-0">
                {p.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[#173E7D] text-sm truncate">{p.displayName}</p>
                <p className="text-[11px] text-[#2B3442]/50 truncate" dir="ltr">
                  /@{p.username}
                </p>
              </div>
            </div>
          </div>

          {/* Horizontally scrollable on narrow screens rather than a drawer:
              six entries fit in a row and a drawer would hide the section
              the reader is in. */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {ITEMS.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `shrink-0 inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#173E7D] text-white"
                      : "text-[#2B3442]/70 hover:bg-[#173E7D]/8 hover:text-[#173E7D]"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Keyed on the path so a section always mounts fresh rather than
              briefly showing the previous one's data. */}
          <Outlet key={location.pathname} context={{ data, reload }} />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
export { UserCircle };
