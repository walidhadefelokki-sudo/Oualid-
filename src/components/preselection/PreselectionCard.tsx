import React from "react";
import { LucideIcon } from "lucide-react";

export interface PreselectionCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
  loading?: boolean;
  onClick?: () => void;
}

const PreselectionCard: React.FC<PreselectionCardProps> = ({
  title,
  value,
  icon: Icon,
  color = "bg-indigo-100 text-indigo-600",
  subtitle,
  loading = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 ${
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-md"
          : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded bg-slate-200" />
          ) : (
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {value}
            </h2>
          )}

          {subtitle && (
            <p className="mt-2 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default PreselectionCard;