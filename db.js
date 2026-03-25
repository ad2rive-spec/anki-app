import { db } from "./firebase.js";
import {
  collection, doc, addDoc, setDoc, getDocs,
  deleteDoc, query, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Cards ──────────────────────────────────────────

export async function addCard(uid, card) {
  return addDoc(collection(db, "users", uid, "cards"), {
    ...card,
    createdAt: serverTimestamp()
  });
}

export async function getCards(uid) {
  const snap = await getDocs(query(collection(db, "users", uid, "cards"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteCard(uid, cardId) {
  await deleteDoc(doc(db, "users", uid, "cards", cardId));
  await deleteDoc(doc(db, "users", uid, "progress", cardId));
}

// ── Progress ───────────────────────────────────────

export async function getProgress(uid) {
  const snap = await getDocs(collection(db, "users", uid, "progress"));
  const map = {};
  snap.docs.forEach(d => { map[d.id] = d.data(); });
  return map;
}

export async function saveProgress(uid, cardId, progress) {
  await setDoc(doc(db, "users", uid, "progress", cardId), progress, { merge: true });
}

// ── CSV Import ─────────────────────────────────────

export async function importCSV(uid, csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const batch = writeBatch(db);
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values.length) continue;
    const card = {};
    headers.forEach((h, idx) => { card[h] = values[idx]?.trim() || ""; });
    if (!card.front) continue;
    // tags: split by semicolon
    if (card.tags) card.tags = card.tags.split(";").map(t => t.trim()).filter(Boolean);
    card.createdAt = serverTimestamp();
    const ref = doc(collection(db, "users", uid, "cards"));
    batch.set(ref, card);
    count++;
  }

  await batch.commit();
  return count;
}

function parseCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}
