import { useEffect, useState } from "react";
import messaging from "./messaging";

/**
 * How many messages are waiting, for the badge in the navigation.
 *
 * Polled slowly — a badge that is thirty seconds stale costs nothing, and
 * this runs on every public page. The thread being read polls quickly; this
 * only has to notice that something arrived somewhere.
 *
 * Returns 0 rather than throwing when the request fails: a navigation bar is
 * no place to report a network error, and the next tick will correct it.
 */

const POLL_MS = 30_000;

export const useUnread = (signedIn: boolean) => {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      setUnread(0);
      return;
    }

    let cancelled = false;
    const read = () =>
      messaging
        .unread()
        .then((n) => !cancelled && setUnread(n))
        .catch(() => undefined);

    read();
    const timer = setInterval(read, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [signedIn]);

  return unread;
};
