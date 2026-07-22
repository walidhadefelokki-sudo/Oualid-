import React from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Brain,
  FolderOpen,
  Mic,
  ClipboardCheck,
  Star,
} from "lucide-react";

import {
  RecruiterTabProps,
} from "../../types/recruiterTabs";

import {
  ACTIVE_TAB_CLASS,
  INACTIVE_TAB_CLASS,
  TAB_BADGES,
  TAB_TRANSITION,
} from "../../constants/recruiterTabs";

/**
 * Icon registry
 */
const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  Briefcase,
  Users,
  Brain,
  FolderOpen,
  Mic,
  ClipboardCheck,
  Star,
};

const RecruiterTab: React.FC<RecruiterTabProps> = ({
  tab,
  active = false,
  onClick,
}) => {
  const Icon =
    ICONS[tab.icon ?? "Users"] ?? Users;

  const badge =
    TAB_BADGES[
      tab.id as keyof typeof TAB_BADGES
    ];

  return (
    <button
      type="button"
      onClick={() => onClick?.(tab)}
      aria-current={active ? "page" : undefined}
      className={`
        ${TAB_TRANSITION}
        relative
        flex
        w-full
        items-center
        gap-3
        rounded-xl
        px-4
        py-3
        text-left
        ${
          active
            ? ACTIVE_TAB_CLASS
            : INACTIVE_TAB_CLASS
        }
      `}
    >
      {/* Icon */}

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-5 w-5" />
      </div>

      {/* Label */}

      <div className="flex flex-1 flex-col">
        <span className="font-medium">
          {tab.label}
        </span>

        {tab.description && (
          <span className="mt-0.5 text-xs opacity-70">
            {tab.description}
          </span>
        )}
      </div>

      {/* Badge */}

      {badge && (
        <span className="rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      )}
            {/* Active Indicator */}

      {active && (
        <span
          className="
            absolute
            left-0
            top-2
            bottom-2
            w-1
            rounded-r-full
            bg-indigo-600
          "
        />
      )}

      {/* Arrow */}

      <svg
        className={`
          h-4
          w-4
          flex-shrink-0
          transition-transform
          duration-200
          ${
            active
              ? "translate-x-1 opacity-100"
              : "opacity-40 group-hover:translate-x-1"
          }
        `}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
  };

export default RecruiterTab;