import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export interface PreselectionStatsProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
  change?: number;
  loading?: boolean;
}

const PreselectionStats: React.FC<PreselectionStatsProps> = ({
  title,
  value,
  icon: Icon,
  color = "bg-indigo-100 text-indigo-600",
  subtitle,
  change,
  loading = false,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          {loading ? (
            <>
              <div className="mt-3 h-9 w-24 animate-pulse rounded bg-slate-200" />
              {subtitle && (
                <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-100" />
              )}
            </>
          ) : (
            <>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {value}
              </h2>

              {subtitle && (
                <p className="mt-2 text-sm text-slate-500">
                  {subtitle}
                </p>
              )}

              {change !== undefined && (
                <div
                  className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    change >= 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}

                  {Math.abs(change)}%
                </div>
              )}
            </>
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

export default PreselectionStats;