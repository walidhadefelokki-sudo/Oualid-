/**
 * Sharing an offer, in one place.
 *
 * Both the home page and the dashboard hand out the same link, so the URL is
 * built here rather than assembled at each call site — otherwise the two drift
 * and one of them starts producing addresses that do not open anything.
 */

/** The canonical address of one offer. Absolute — it is going into a paste. */
export const jobShareUrl = (jobId: string) => `${window.location.origin}/jobs/${jobId}`;

export interface ShareableJob {
  id: string;
  title?: string;
  company?: string;
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'prompted';

/**
 * Offers an offer to whatever the browser has.
 *
 * The native share sheet first, which on a phone is what people expect and
 * reaches WhatsApp directly. Then the clipboard, which needs a secure context
 * and is not guaranteed. Then a prompt, because a share button that silently
 * does nothing reads as broken.
 *
 * Returns what actually happened so the caller can decide whether to say
 * anything — "Lien copié" is worth showing, a dismissed share sheet is not.
 */
export const shareJobLink = async (
  job: ShareableJob,
  labels: { title: string; copyPrompt: string }
): Promise<ShareOutcome> => {
  const url = jobShareUrl(job.id);
  const title = job.title
    ? `${job.title}${job.company ? ' — ' + job.company : ''}`
    : labels.title;

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (err) {
      // Dismissing the sheet is a choice, not a failure to report.
      if ((err as Error)?.name === 'AbortError') return 'dismissed';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt(labels.copyPrompt, url);
    return 'prompted';
  }
};
