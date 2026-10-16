import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Briefcase, Globe, Menu, X } from "lucide-react";
import { Lang, useI18n } from "./i18n";
import logoLight from "../assets/logo2-v2.png";

/**
 * The shell around every public marketplace page.
 *
 * Shares the recruitment platform's navy and gold rather than inventing a
 * second identity: the specification asks for one charte graphique across
 * both sides.
 */

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
  { code: "en", label: "EN" },
];

const LanguageSwitch: React.FC = () => {
  const { lang, setLang } = useI18n();

  return (
    <div
      className="inline-flex items-center rounded-full border border-white/25 p-0.5"
      role="group"
      aria-label="Langue"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${
            lang === l.code ? "bg-white text-[#173E7D]" : "text-white/70 hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold transition-colors ${
    isActive ? "text-white" : "text-white/70 hover:text-white"
  }`;

const PublicLayout: React.FC = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <NavLink to="/categories" className={navClass} onClick={() => setOpen(false)}>
        {t("nav.categories")}
      </NavLink>
      <NavLink to="/projets" className={navClass} onClick={() => setOpen(false)}>
        {t("nav.projects")}
      </NavLink>
      <NavLink to="/freelances" className={navClass} onClick={() => setOpen(false)}>
        {t("nav.freelancers")}
      </NavLink>
      <NavLink to="/tarifs" className={navClass} onClick={() => setOpen(false)}>
        {t("nav.pricing")}
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#2B3442]">
      <header className="bg-gradient-to-r from-[#0B1E3D] to-[#173E7D] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {/* The pale wordmark, not the navy one: this header is a navy
                  gradient and logo-v2.png would disappear into it. The asset
                  is imported rather than the Logo2 component because that
                  component only offers h-6, h-12 and h-24, and none of the
                  three sits well in a 64px bar. */}
              <img
                src={logoLight}
                alt="Dar L'Emploi"
                className="h-7 sm:h-8 w-auto block object-contain"
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] border border-[#D4AF37]/50 rounded px-1.5 py-0.5">
                {t("brand.freelance")}
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6">{links}</nav>

            <div className="ms-auto flex items-center gap-3">
              <LanguageSwitch />

              {/* Back to the recruitment site. A full page load on purpose:
                  it is the other application, not another route. */}
              <a
                href="/"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white"
              >
                <Briefcase size={14} /> {t("nav.backToJobs")}
              </a>

              <button
                onClick={() => setOpen((v) => !v)}
                className="lg:hidden text-white"
                aria-label="Menu"
                aria-expanded={open}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {open && (
            <nav className="lg:hidden flex flex-col gap-3 pb-4 border-t border-white/10 pt-4">
              {links}
              <a href="/" className="text-sm font-semibold text-white/70">
                {t("nav.backToJobs")}
              </a>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#0B1E3D] text-white/60 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <span className="font-display text-white text-base">Dar L'Emploi Freelance</span>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link to="/aide" className="hover:text-white">
                {t("footer.help")}
              </Link>
              <Link to="/conditions" className="hover:text-white">
                {t("footer.terms")}
              </Link>
              <Link to="/confidentialite" className="hover:text-white">
                {t("footer.privacy")}
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-xs">
            © {new Date().getFullYear()} Dar L'Emploi. {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export { LanguageSwitch, Globe };
export default PublicLayout;
