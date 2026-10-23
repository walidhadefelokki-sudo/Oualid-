import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../analytics";

/**
 * Reports a page view on every route change in the marketplace.
 *
 * GA4's automatic page_view fires once, when the tag loads, so in a single
 * page application it would only ever record the URL someone entered on.
 * Every navigation after that would be invisible, and the daily traffic
 * figure would be wrong in a way that looks plausible.
 *
 * The path includes the router's basename, so what GA records matches what
 * is in the address bar.
 */
export const usePageViews = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(window.location.pathname + location.search);
  }, [location.pathname, location.search]);
};
