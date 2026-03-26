import { db } from "./firebase.js";
import {
  collection, doc, addDoc, setDoc, getDocs,
  deleteDoc, query, orderBy, serverTimestamp, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Decks ──────────────────────────────────────────

export async function getDecks(uid) {
  const snap = await getDocs(collection(db, "users", uid, "decks"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function ensureDeck(uid, name) {
  // 找已存在的同名牌組，沒有就建立
  const snap = await getDocs(collection(db, "users", uid, "decks"));
  const existing = snap.docs.find(d => d.data().name === name);
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, "users", uid, "decks"), { name, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteDeck(uid, deckId) {
  // 刪牌組及其所有卡片
  const cards = await getCards(uid, deckId);
  const batch = writeBatch(db);
  cards.forEach(c => {
    batch.delete(doc(db, "users", uid, "cards", c.id));
    batch.delete(doc(db, "users", uid, "progress", c.id));
  });
  batch.delete(doc(db, "users", uid, "decks", deckId));
  await batch.commit();
}

// ── Cards ──────────────────────────────────────────

export async function addCard(uid, card) {
  return addDoc(collection(db, "users", uid, "cards"), {
    ...card,
    createdAt: serverTimestamp()
  });
}

export async function getCards(uid, deckId = null) {
  const snap = await getDocs(query(collection(db, "users", uid, "cards"), orderBy("createdAt", "desc")));
  const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (deckId) return cards.filter(c => c.deckId === deckId);
  return cards;
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

export async function importCSV(uid, csvText, onProgress) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  // 先解析所有卡片
  const allCards = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values.length) continue;
    const card = {};
    headers.forEach((h, idx) => { card[h] = values[idx]?.trim() || ""; });
    if (!card.front) continue;

    const deckName = card.deck || "預設牌組";
    card._deckName = deckName;
    delete card.deck;
    if (card.tags) card.tags = card.tags.split(";").map(t => t.trim()).filter(Boolean);
    else card.tags = [];
    allCards.push(card);
  }

  // 預先建立所有牌組
  const deckCache = {};
  const deckNames = [...new Set(allCards.map(c => c._deckName))];
  for (const name of deckNames) {
    deckCache[name] = await ensureDeck(uid, name);
  }

  // 分批寫入，每批 500 筆
  const BATCH_SIZE = 500;
  let count = 0;
  for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
    const chunk = allCards.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const card of chunk) {
      card.deckId = deckCache[card._deckName];
      delete card._deckName;
      card.createdAt = serverTimestamp();
      const ref = doc(collection(db, "users", uid, "cards"));
      batch.set(ref, card);
      count++;
    }
    await batch.commit();
    if (onProgress) onProgress(count, allCards.length);
    // 讓瀏覽器有機會重繪 DOM
    await new Promise(r => setTimeout(r, 0));
  }

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
