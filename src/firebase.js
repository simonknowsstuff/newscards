import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "newscards.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "newscards-6564e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "newscards.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);

// Connect to emulators only if specifically enabled
// This prevents connection refused errors when the emulator is not running
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && (
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.match(/^192\.168\.\d+\.\d+$/)
)) {
  console.log("Connecting to Firebase Emulators...");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { db, functions };
