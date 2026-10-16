import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import FreelanceApp from './freelance/FreelanceApp.tsx';
import './index.css';

/**
 * Two applications, one bundle.
 *
 * The recruitment app navigates by a `view` string in App.tsx rather than by
 * URL. The marketplace cannot work that way — it has public pages that have
 * to be linkable, indexable and shareable — so it brings a real router, and
 * the split happens here so neither app has to know about the other.
 *
 * Mounted under /freelance for now rather than on freelance.darlemploi.dz.
 * Same origin means the session in localStorage is simply shared, which is
 * the "connexion unique" the specification asks for, without touching how
 * the recruitment app authenticates. Moving to the subdomain later changes
 * this one decision and the router's basename, nothing else.
 */
const isFreelance = window.location.pathname.startsWith('/freelance');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isFreelance ? <FreelanceApp /> : <App />}</StrictMode>,
);
