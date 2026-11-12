import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, Briefcase, Globe, Menu, X } from "lucide-react";
import { Lang, useI18n } from "./i18n";
import { useAuth } from "./auth";
import { usePageViews } from "./usePageViews";
import { useUnread } from "./useUnread";
import { useCredits } from "./useWorkspace";
import { Avatar, Badge, Wordmark, btn } from "./ui";
import CookieNotice, { openCookiePolicy } from "../components/CookieNotice";

/**
 * The shell around every marketplace page.
 *
 * One header, two modes. The canvas draws a public header (navigation,
 * language, a "publier un service" call to action) and a workspace header
 * (mode switch, credit balance, avatar) — same white bar, same hairline,
 * different contents. They are one component here rather than two layouts
 * because the workspace routes are nested inside this one: splitting them
 * would mean two copies of the cookie notice and the page-view tracking.
 *
 * The footer belongs to the public pages only. None of the workspace
 * artboards has one, and a dashboard that scrolls into a sitemap is a
 * dashboard nobody reaches the bottom of.
 */

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
  { code: "en", label: "EN" },
];

/**
 * The language trough: a ground-coloured pill with the active language as a
 * navy pill inside it.
 *
 * `aria-pressed` rather than `role="tab"` — these do not reveal panels, they
 * change the whole document's language.
 */
const LanguageSwitch: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={"inline-flex items-center rounded-full bg-ground p-1 " + className}
      role="group"
      aria-label="Langue"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={
            "min-h-9 rounded-full px-3 text-[13px] font-bold transition-colors " +
            (lang === l.code ? "bg-primary text-white" : "text-primary hover:bg-surface")
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */

const navClass = ({ isActive }: { isActive: boolean }) =>
  "whitespace-nowrap text-[15px] font-semibold transition-colors " +
  (isActive ? "text-accent-ink" : "text-primary hover:text-navy-deep");

/** The unread count, as a navy pill. Hidden from the count itself at zero. */
const Unread: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const PublicLayout: React.FC = () => {
  const { t, lang } = useI18n();
  const { signedIn, loading, user } = useAuth();
  const location = useLocation();
  usePageViews();
  const unread = useUnread(signedIn);
  const credits = useCredits();
  const [open, setOpen] = useState(false);

  /* The workspace and the client area are the signed-in product; the rest is
   * the shopfront. The header follows the route rather than the session,
   * because a signed-in visitor browsing categories still wants the
   * shopfront's navigation. */
  const inWorkspace = location.pathname.startsWith("/freelance-espace");
  const inClientArea = location.pathname.startsWith("/client");
  const atWork = inWorkspace || inClientArea;

  const close = () => setOpen(false);

  const links = (
    <>
      <NavLink to="/categories" className={navClass} onClick={close}>
        {t("nav.categories")}
      </NavLink>
      <NavLink to="/projets" className={navClass} onClick={close}>
        {t("nav.projects")}
      </NavLink>
      <NavLink to="/freelances" className={navClass} onClick={close}>
        {t("nav.freelancers")}
      </NavLink>
      {/* "Tarifs", not "Tarifs et crédits". The long form is the page's own
          title and is kept for the footer; in a bar this tight it was the
          single widest entry. */}
      <NavLink to="/tarifs" className={navClass} onClick={close}>
        {t("nav.pricingShort")}
      </NavLink>
      {signedIn && (
        <NavLink
          to="/messages"
          className={(s) => navClass(s) + " inline-flex items-center gap-1.5"}
          onClick={close}
        >
          {t("nav.messages")}
          <Unread count={unread} />
        </NavLink>
      )}
    </>
  );

  /** Freelance / client, the two sides of one account. */
  const modeSwitch = (
    <div className="inline-flex items-center rounded-full bg-ground p-1" role="group" aria-label="Changer de mode">
      <Link
        to="/freelance-espace"
        aria-current={inWorkspace ? "page" : undefined}
        className={
          "min-h-9 rounded-full px-3.5 text-[13px] font-bold transition-colors " +
          (inWorkspace ? "bg-secondary text-ink" : "text-primary hover:bg-surface")
        }
      >
        {t("mode.freelance")}
      </Link>
      <Link
        to="/client/projets"
        aria-current={inClientArea ? "page" : undefined}
        className={
          "min-h-9 rounded-full px-3.5 text-[13px] font-bold transition-colors " +
          (inClientArea ? "bg-success text-white" : "text-primary hover:bg-surface")
        }
      >
        {t("mode.client")}
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-ground text-primary">
      <header className="bg-surface border-b border-line">
        {/* One row that never wraps.
            It used to be flex-wrap, which looks harmless until the bar runs
            out of room: the right-hand group has `ms-auto`, so instead of
            tightening it dropped onto a second line and sat far right under
            the navigation. Signing in was enough to trigger it, because that
            adds both "Messages" and "Mon espace". Now nothing wraps — the
            navigation hides below xl and the burger takes over. */}
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-8">
          <Link to="/" className="shrink-0" aria-label="Dar L'emploi Freelance">
            <Wordmark label={t("brand.freelance")} />
          </Link>

          {atWork ? (
            <>
              <div className="hidden shrink-0 sm:block">{modeSwitch}</div>

              <div className="ms-auto flex shrink-0 items-center gap-3">
                {/* Only when there is a balance to state. A pill reading
                    "0 crédits" to someone with no freelance account is a
                    number about nothing. */}
                {credits !== null && (
                  <Link to="/acheter-credits" className="shrink-0">
                    <Badge tone="warn" className="min-h-10 px-3.5 text-sm">
                      ◆ {credits} {t("ws.credits")}
                    </Badge>
                  </Link>
                )}

                <Link
                  to="/messages"
                  aria-label={t("nav.messages")}
                  className="relative grid h-11 w-11 place-items-center rounded-full bg-ground text-primary hover:bg-line"
                >
                  <Bell size={20} aria-hidden="true" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -end-0.5">
                      <Unread count={unread} />
                    </span>
                  )}
                </Link>

                <Avatar
                  name={user?.firstName || user?.email || "?"}
                  url={user?.avatar?.url}
                  tone="orange"
                />
              </div>
            </>
          ) : (
            <>
              {/* xl, not lg. Signed in there are five entries plus the
                  language switch, "Mon espace" and the call to action, and
                  at 1024px they do not fit; below xl the burger carries
                  them instead. */}
              <nav
                aria-label="Navigation principale"
                className="hidden min-w-0 items-center gap-5 xl:flex"
              >
                {links}
              </nav>

              <div className="ms-auto flex shrink-0 items-center gap-2.5">
                <LanguageSwitch className="hidden md:inline-flex" />

                {/* Shown only once we know: rendering "Connexion" during the
                    check and swapping it a moment later reads as a glitch. */}
                {!loading &&
                  (signedIn ? (
                    <Link
                      to="/freelance-espace"
                      className="hidden text-[15px] font-bold text-primary hover:underline sm:inline-flex"
                    >
                      {t("nav.dashboard")}
                    </Link>
                  ) : (
                    <Link
                      to="/connexion"
                      className="hidden px-3 text-[15px] font-bold text-primary hover:underline sm:inline-flex"
                    >
                      {t("nav.signin")}
                    </Link>
                  ))}

                <Link
                  to="/freelance-espace/services/nouveau"
                  className={btn("accent", "hidden sm:inline-flex")}
                >
                  {t("home.ctaPublishService")}
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ground text-primary xl:hidden"
                  aria-label="Menu"
                  aria-expanded={open}
                >
                  {open ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </>
          )}
        </div>

        {open && !atWork && (
          <nav
            aria-label="Navigation principale"
            className="flex flex-col gap-4 border-t border-line px-4 py-5 sm:px-8 xl:hidden"
          >
            {links}
            <LanguageSwitch className="self-start md:hidden" />
            {!signedIn && (
              <Link to="/connexion" className={btn("ghost", "self-start")} onClick={close}>
                {t("nav.signin")}
              </Link>
            )}
            <Link
              to="/freelance-espace/services/nouveau"
              className={btn("accent", "self-start sm:hidden")}
              onClick={close}
            >
              {t("home.ctaPublishService")}
            </Link>
            <a href="/" className="text-[15px] font-semibold text-muted">
              {t("nav.backToJobs")}
            </a>
          </nav>
        )}

        {/* The mode switch does not fit the top row on a phone. */}
        {atWork && <div className="border-t border-line px-4 py-3 sm:hidden">{modeSwitch}</div>}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {!atWork && (
        <footer className="mt-16 bg-ink text-on-ink">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-10 px-4 py-14 sm:px-8">
            <div className="flex flex-1 basis-70 flex-col gap-3">
              <Wordmark on="dark" size="lg" label={t("brand.freelance")} />
              <p className="max-w-80 text-sm leading-relaxed">{t("footer.oneAccount")}</p>
              <a
                href="/"
                className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-white hover:underline"
              >
                <Briefcase size={14} aria-hidden="true" /> {t("nav.backToJobs")}
              </a>
            </div>

            <nav aria-label={t("footer.platform")} className="flex basis-44 flex-col gap-2.5 text-sm">
              <b className="text-white">{t("footer.platform")}</b>
              <Link to="/categories" className="hover:text-white">
                {t("nav.categories")}
              </Link>
              <Link to="/projets" className="hover:text-white">
                {t("nav.projects")}
              </Link>
              <Link to="/tarifs" className="hover:text-white">
                {t("nav.pricing")}
              </Link>
            </nav>

            <nav aria-label={t("footer.help")} className="flex basis-44 flex-col gap-2.5 text-sm">
              <b className="text-white">{t("footer.help")}</b>
              <Link to="/aide" className="hover:text-white">
                {t("footer.help")}
              </Link>
              <Link to="/conditions" className="hover:text-white">
                {t("footer.terms")}
              </Link>
              <Link to="/confidentialite" className="hover:text-white">
                {t("footer.privacy")}
              </Link>
              <button type="button" onClick={openCookiePolicy} className="text-start hover:text-white">
                {t("footer.cookies")}
              </button>
            </nav>

            <nav aria-label="Dar L'emploi" className="flex basis-44 flex-col gap-2.5 text-sm">
              <b className="text-white">Dar L&apos;emploi</b>
              <a href="https://www.darlemploi.dz" className="hover:text-white">
                {t("footer.jobs")}
              </a>
              <a href="https://www.darlemploi.dz" className="hover:text-white">
                {t("footer.postCv")}
              </a>
            </nav>
          </div>

          <div className="mx-auto max-w-7xl border-t border-white/10 px-4 py-6 text-xs sm:px-8">
            © {new Date().getFullYear()} Dar L&apos;emploi. {t("footer.rights")}
          </div>
        </footer>
      )}

      <CookieNotice language={lang} />
    </div>
  );
};

export { LanguageSwitch, Globe };
export default PublicLayout;
