import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminDb: Firestore;
let adminAuth: Auth;

function initializeFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Use environment variable for service account
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    console.log("Initializing Firebase Admin with service account from env");
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error("Failed to parse service account key:", error);
    return null;
  }
}

const app = initializeFirebaseAdmin();

if (app) {
  adminDb = getFirestore(app);
  adminAuth = getAuth(app);
}

export { adminDb, adminAuth };
