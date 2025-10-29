import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  // Add other config values as needed
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Reduce logging in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // Set Firebase log level to reduce verbose warnings
  console.warn = (
    (originalWarn) =>
    (...args) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("@firebase/firestore")
      ) {
        // Skip Firebase Firestore connection warnings in development
        return;
      }
      return originalWarn(...args);
    }
  )(console.warn);
}

export default app;
