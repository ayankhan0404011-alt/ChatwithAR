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

// If already logged in, go straight to the chat page
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
    formSub.textContent = "Sign in with just a username and password — no phone number required.";
    submitBtn.textContent = "Sign in";
    switchText.textContent = "Need a new account?";
    switchBtn.textContent = "Sign up";
  } else {
    formTitle.textContent = "Create an account";
    formSub.textContent = "Choose a unique username. It can't be changed later.";
    submitBtn.textContent = "Create account";
    switchText.textContent = "Already have an account?";
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
        showError("This username is already taken. Please try another.");
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
      showError("Incorrect username or password.");
    } else if (code.includes("email-already-in-use")) {
      showError("This username is already taken.");
    } else if (code.includes("weak-password")) {
      showError("Password must be at least 6 characters.");
    } else {
      showError("Something went wrong: " + err.message);
    }
  }
});
