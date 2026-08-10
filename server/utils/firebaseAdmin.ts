import admin from "firebase-admin";

// Initialize the Firebase Admin SDK once, using a service account.
//
// Set FIREBASE_SERVICE_ACCOUNT in your .env to the *entire* JSON contents
// of a service account key (Firebase Console -> Project Settings ->
// Service accounts -> Generate new private key), on a single line.
//
// Example .env entry:
//   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"...", ...}
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    console.warn(
      "⚠️  FIREBASE_SERVICE_ACCOUNT is not set. Google sign-in verification " +
        "will fail until you add a Firebase service account key to your .env."
    );
  } else {
    try {
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (err) {
      console.error(
        "❌ Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it's valid JSON on a single line.",
        err
      );
    }
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (!admin.apps.length) {
    throw new Error(
      "Firebase Admin isn't initialized. Set FIREBASE_SERVICE_ACCOUNT in your .env."
    );
  }
  return admin.auth().verifyIdToken(idToken);
}

export default admin;