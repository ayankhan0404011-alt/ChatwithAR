    import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, query, orderBy, onSnapshot, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const contactList = document.getElementById("contactList");
const conversationPane = document.getElementById("conversationPane");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  const tokenResult = await user.getIdTokenResult(true);
  if (!tokenResult.claims.admin) {
    document.body.innerHTML = `<div class="auth-shell"><div class="auth-card">
      <h1 class="auth-title">Access denied</h1>
      <p class="auth-sub">This account is not an admin.</p>
    </div></div>`;
    return;
  }
  loadAllChats();
});

function loadAllChats() {
  const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      contactList.innerHTML = `<div class="empty-contacts">No chats yet.</div>`;
      return;
    }
    contactList.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const names = Object.values(data.participantUsernames || {}).join(" ↔ ");
      const el = document.createElement("div");
      el.className = "contact";
      el.innerHTML = `
        <div class="contact-name">${escapeHtml(names || docSnap.id)}</div>
        <div class="contact-preview">${escapeHtml(data.lastMessage || "")}</div>
      `;
      el.addEventListener("click", () => openChat(docSnap.id, names));
      contactList.appendChild(el);
    });
  });
}

async function openChat(chatId, names) {
  document.querySelectorAll(".contact").forEach((c) => c.classList.remove("active"));

  conversationPane.innerHTML = `
    <div class="conv-header">
      <div class="name">${escapeHtml(names)}</div>
      <div class="privacy-tag">admin view</div>
    </div>
    <div class="messages" id="messages"></div>
  `;

  const messagesEl = document.getElementById("messages");
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  messagesEl.innerHTML = "";
  snap.forEach((docSnap) => {
    const m = docSnap.data();
    const time = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : "";
    const row = document.createElement("div");
    row.className = "msg-row theirs";
    row.innerHTML = `<div class="bubble">${escapeHtml(m.text)}<span class="time">${time}</span></div>`;
    messagesEl.appendChild(row);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
