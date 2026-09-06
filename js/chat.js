import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, orderBy,
  onSnapshot, addDoc, serverTimestamp, updateDoc, limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const whoami = document.getElementById("whoami");
const logoutBtn = document.getElementById("logoutBtn");
const newChatUsername = document.getElementById("newChatUsername");
const newChatBtn = document.getElementById("newChatBtn");
const contactList = document.getElementById("contactList");
const conversationPane = document.getElementById("conversationPane");
const chatShell = document.getElementById("chatShell");

let currentUser = null;
let currentUsername = null;
let activeChatId = null;
let unsubMessages = null;
const chatMetaCache = {}; // chatId -> { otherUsername, ... }

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  const profileSnap = await getDoc(doc(db, "users", user.uid));
  currentUsername = profileSnap.exists() ? profileSnap.data().username : "you";
  whoami.textContent = currentUsername;
  listenToChats();
});

logoutBtn.addEventListener("click", () => signOut(auth));

function chatIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("__");
}

newChatBtn.addEventListener("click", startNewChat);
newChatUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startNewChat();
});

async function startNewChat() {
  const target = newChatUsername.value.trim().toLowerCase();
  if (!target) return;
  if (target === currentUsername.toLowerCase()) {
    alert("Aap khud se chat nahi kar sakte.");
    return;
  }

  const usernameDoc = await getDoc(doc(db, "usernames", target));
  if (!usernameDoc.exists()) {
    alert("Ye username nahi mila.");
    return;
  }
  const otherUid = usernameDoc.data().uid;
  const chatId = chatIdFor(currentUser.uid, otherUid);
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants: [currentUser.uid, otherUid],
      participantUsernames: {
        [currentUser.uid]: currentUsername,
        [otherUid]: usernameDoc.id
      },
      lastMessage: "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }

  newChatUsername.value = "";
  openChat(chatId);
}

function listenToChats() {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", currentUser.uid),
    orderBy("updatedAt", "desc")
  );

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      contactList.innerHTML = `<div class="empty-contacts">Abhi koi chat nahi hai. Upar username daal kar shuru karein.</div>`;
      return;
    }
    contactList.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const chatId = docSnap.id;
      const otherUid = data.participants.find((p) => p !== currentUser.uid);
      const otherUsername = data.participantUsernames?.[otherUid] || "unknown";
      chatMetaCache[chatId] = { otherUsername, otherUid };

      const el = document.createElement("div");
      el.className = "contact" + (chatId === activeChatId ? " active" : "");
      el.innerHTML = `
        <div class="contact-name">${escapeHtml(otherUsername)}</div>
        <div class="contact-preview">${escapeHtml(data.lastMessage || "Chat shuru karein…")}</div>
      `;
      el.addEventListener("click", () => openChat(chatId));
      contactList.appendChild(el);
    });
  });
}

function openChat(chatId) {
  activeChatId = chatId;
  chatShell.classList.add("conv-open");

  document.querySelectorAll(".contact").forEach((c) => c.classList.remove("active"));

  const meta = chatMetaCache[chatId];
  const otherUsername = meta ? meta.otherUsername : "…";

  conversationPane.innerHTML = `
    <div class="conv-header">
      <button class="back-btn" id="backBtn">‹</button>
      <div class="name">${escapeHtml(otherUsername)}</div>
      <div class="privacy-tag">private</div>
    </div>
    <div class="messages" id="messages"></div>
    <div class="composer">
      <input type="text" id="msgInput" placeholder="Message likhein…" autocomplete="off" />
      <button id="sendBtn">Send</button>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    chatShell.classList.remove("conv-open");
  });

  const msgInput = document.getElementById("msgInput");
  const sendBtn = document.getElementById("sendBtn");

  const send = async () => {
    const text = msgInput.value.trim();
    if (!text) return;
    msgInput.value = "";
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUser.uid,
      text,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: text,
      updatedAt: serverTimestamp()
    });
  };

  sendBtn.addEventListener("click", send);
  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  if (unsubMessages) unsubMessages();
  const messagesEl = document.getElementById("messages");
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  unsubMessages = onSnapshot(q, (snap) => {
    messagesEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const mine = m.senderId === currentUser.uid;
      const time = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const row = document.createElement("div");
      row.className = "msg-row " + (mine ? "mine" : "theirs");
      row.innerHTML = `<div class="bubble">${escapeHtml(m.text)}<span class="time">${time}</span></div>`;
      messagesEl.appendChild(row);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  msgInput.focus();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
  }
