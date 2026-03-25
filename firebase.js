import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAP3SYexReWgSp6XWA7z4RhO_J7vNZG_ew",
  authDomain: "anki-app-93667.firebaseapp.com",
  projectId: "anki-app-93667",
  storageBucket: "anki-app-93667.firebasestorage.app",
  messagingSenderId: "936944076604",
  appId: "1:936944076604:web:623bef63683fbac5d44039"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
