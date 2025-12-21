import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import serviceAccount from "./service-account.json";

let adminDb: Firestore;
let adminAuth: Auth;

function initializeFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  console.log("Initializing Firebase Admin with service account file");
  return initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
}

const app = initializeFirebaseAdmin();

if (app) {
  adminDb = getFirestore(app);
  adminAuth = getAuth(app);
}

export { adminDb, adminAuth };
