import React from "react";
import { SearchX, RefreshCw } from "lucide-react";

interface PreselectionEmptyProps {
  title?: string;
  description?: string;
  showReset?: boolean;
  resetLabel?: string;
  onReset?: () => void;
}

const PreselectionEmpty: React.FC<PreselectionEmptyProps> = ({
  title = "Aucun candidat trouvé",
  description = "Aucun candidat ne correspond aux filtres actuels. Essayez d'ajuster vos critères de recherche ou de réinitialiser les filtres.",
  showReset = true,
  resetLabel = "Réinitialiser les filtres",
  onReset,
}) => {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 shadow-sm">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <SearchX className="h-10 w-10 text-slate-400" />
        </div>

        <h2 className="text-xl font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {description}
        </p>

        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default PreselectionEmpty;