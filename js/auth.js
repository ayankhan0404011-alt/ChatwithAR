import { auth, db, EMAIL_DOMAIN } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let mode = "login"; // or "signup"

const form = document.getElementById("authForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("errorBox");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const switchText = document.getElementById("switchText");
const formTitle = document.getElementById("formTitle");
const formSub = document.getElementById("formSub");

// Agar already logged in hai, seedha chat page pe bhej do
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "chat.html";
});

switchBtn.addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  updateFormMode();
});

function updateFormMode() {
  errorBox.classList.remove("show");
  if (mode === "login") {
    formTitle.textContent = "Welcome back";
    formSub.textContent = "Sirf username aur password se sign in karein — koi mobile number nahi chahiye.";
    submitBtn.textContent = "Sign in";
    switchText.textContent = "Naya account banana hai?";
    switchBtn.textContent = "Sign up";
  } else {
    formTitle.textContent = "Account banayein";
    formSub.textContent = "Ek unique username chunein. Ye baad mein badla nahi ja sakta.";
    submitBtn.textContent = "Create account";
    switchText.textContent = "Pehle se account hai?";
    switchBtn.textContent = "Sign in";
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add("show");
}

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${EMAIL_DOMAIN}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.remove("show");
  submitBtn.disabled = true;

  const rawUsername = usernameInput.value.trim();
  const username = rawUsername.toLowerCase();
  const password = passwordInput.value;

  try {
    if (mode === "signup") {
      // check username availability
      const usernameDoc = await getDoc(doc(db, "usernames", username));
      if (usernameDoc.exists()) {
        showError("Ye username pehle se liya ja chuka hai. Doosra try karein.");
        submitBtn.disabled = false;
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(username), password);
      const uid = cred.user.uid;

      // reserve username -> uid mapping
      await setDoc(doc(db, "usernames", username), { uid });
      // public-ish profile (no password, no phone — just username)
      await setDoc(doc(db, "users", uid), {
        username: rawUsername,
        usernameLower: username,
        createdAt: serverTimestamp()
      });

      window.location.href = "chat.html";
    } else {
      const cred = await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
      window.location.href = "chat.html";
    }
  } catch (err) {
    submitBtn.disabled = false;
    const code = err.code || "";
    if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password")) {
      showError("Username ya password galat hai.");
    } else if (code.includes("email-already-in-use")) {
      showError("Ye username pehle se liya ja chuka hai.");
    } else if (code.includes("weak-password")) {
      showError("Password kam se kam 6 characters ka hona chahiye.");
    } else {
      showError("Kuch galat ho gaya: " + err.message);
    }
  }
});
