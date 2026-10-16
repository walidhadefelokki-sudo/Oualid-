import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";

/**
 * The freelancer's own workspace data.
 *
 * Loaded once by the layout and handed to each section through the outlet
 * context, so switching between sections does not refetch the profile, the
 * wallet and eight counts every time.
 */

export interface WorkspaceProfile {
  username: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  wilaya: string | null;
  hourlyRate: string | null;
  availability: string;
  level: string;
  identityVerified: boolean;
  ratingAverage: string | null;
  ratingCount: number;
  completedOrders: number;
  languages: string[];
  category: { id: string; name: string } | null;
  skills: string[];
  portfolioPublished: boolean;
}

export interface WorkspaceStats {
  published: number;
  pending: number;
  drafts: number;
  expired: number;
  proposalsSent: number;
  proposalsShortlisted: number;
  activeOrders: number;
  completedOrders: number;
}

export interface WorkspaceWallet {
  balance: number;
  costs: {
    servicePublication: number;
    proposal: number;
    serviceDurationDays: number;
    trialServices: number;
    trialProposals: number;
  };
}

/** What the account's plan allows, as the server computed it. */
export interface Entitlements {
  tier: "FREE" | "PRO" | "PREMIUM" | "AGENCY";
  planName: string;
  subscriptionId: string | null;
  renewsAt: string | null;

  /** Null means unlimited. */
  maxActiveServices: number | null;
  activeServices: number;
  canPublishService: boolean;

  monthlyProposals: number | null;
  proposalsUsedThisPeriod: number;
  proposalsRemaining: number | null;

  maxPortfolioProjects: number | null;
  portfolioProjects: number;

  prioritySearch: boolean;
  removableBranding: boolean;
  customSubdomain: boolean;

  weeklyBoosts: number;
  boostsUsedThisWeek: number;

  stats: "none" | "basic" | "full";
}

export interface WorkspaceData {
  active: boolean;
  profile?: WorkspaceProfile;
  stats?: WorkspaceStats;
  wallet?: WorkspaceWallet;
  entitlements?: Entitlements;
}

export const useWorkspace = (enabled: boolean) => {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: body } = await api.get("/freelance/me/workspace");
      setData(body.data);
    } catch {
      // A failure here is almost always an expired token, which the auth
      // provider has already cleared. Treating it as "not active" shows the
      // sign-in screen rather than an error about a side request.
      setData({ active: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
    else setLoading(false);
  }, [enabled, reload]);

  return { data, loading, reload };
};

/** What the layout passes down to each section. */
export interface WorkspaceContext {
  data: WorkspaceData;
  reload: () => Promise<void>;
}

export const useWorkspaceContext = () => useOutletContext<WorkspaceContext>();
