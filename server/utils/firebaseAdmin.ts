import admin from "firebase-admin";
import firebaseWebConfig from "../../firebase-applet-config.json";

// Initialize the Firebase Admin SDK once, using a service account.
//
// Set FIREBASE_SERVICE_ACCOUNT to the *entire* JSON contents of a service
// account key (Firebase Console -> Project Settings -> Service accounts ->
// Generate new private key), on a single line.

/** Set when the key is present but unusable, so callers can explain why. */
let initError: string | null = null;

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    initError =
      "FIREBASE_SERVICE_ACCOUNT is not set, so Google ID tokens cannot be verified.";
    console.warn(`⚠️  ${initError}`);
  } else {
    try {
      const serviceAccount = JSON.parse(raw);

      // The Admin SDK verifies a token's audience against *its own* project.
      // If the service account belongs to a different Firebase project than
      // the one the browser signs in against, every verification fails with
      // an opaque "incorrect audience" error. Catch that here, at startup,
      // where the message can name both projects.
      const adminProject = serviceAccount.project_id;
      const webProject = (firebaseWebConfig as { projectId?: string }).projectId;

      if (adminProject && webProject && adminProject !== webProject) {
        initError =
          `Firebase project mismatch: the service account belongs to ` +
          `"${adminProject}" but the frontend signs in against "${webProject}". ` +
          `Google sign-in cannot work until both name the same project — ` +
          `either generate a service account key from "${webProject}", or ` +
          `update firebase-applet-config.json to the web config of "${adminProject}".`;
        console.error(`❌ ${initError}`);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (err) {
      initError =
        "FIREBASE_SERVICE_ACCOUNT could not be parsed. It must be the full " +
        "service-account JSON on a single line.";
      console.error(`❌ ${initError}`, err);
    }
  }
}

/**
 * Verifies a Google ID token issued to the browser.
 *
 * Throws with a message that says what is actually wrong — a missing key, a
 * malformed key, or a project mismatch — rather than letting the Admin SDK's
 * generic error reach the client.
 */
export async function verifyFirebaseIdToken(idToken: string) {
  if (!admin.apps.length) {
    throw new Error(
      initError ??
        "Firebase Admin is not initialized. Set FIREBASE_SERVICE_ACCOUNT in the environment."
    );
  }

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err: any) {
    // A project mismatch surfaces here as an audience error; prefer the
    // startup diagnosis, which names both projects.
    if (initError) {
      throw new Error(initError);
    }
    throw err;
  }
}

/** True when Google sign-in is usable. Lets routes report status without throwing. */
export const isFirebaseReady = () => admin.apps.length > 0 && !initError;

export default admin;
