// ============================================
// ChatAR ka Firebase config (already bhara hua hai)
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQfiDE_j7-hRtogOeq6cM0TPIHo8UADJg",
  authDomain: "chatar-45776.firebaseapp.com",
  projectId: "chatar-45776",
  storageBucket: "chatar-45776.firebasestorage.app",
  messagingSenderId: "183849444068",
  appId: "1:183849444068:web:f3661714d13f35712b02f1"
};

// Ye domain sirf internal use ke liye hai — Firebase Auth ko email format
// chahiye hota hai, isliye username ko "username@chatapp.local" bana ke bhejte hain.
// User ko kabhi ye email dikhta nahi, wo sirf username/password hi use karta hai.
export const EMAIL_DOMAIN = "chatapp.local";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
