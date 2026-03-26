import { db } from "./firebase.js";
import {
  collection, doc, addDoc, setDoc, getDocs,
  deleteDoc, query, orderBy, where, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Decks ──────────────────────────────────────────

export async function getDecks(uid) {
  const snap = await getDocs(collection(db, "users", uid, "decks"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function ensureDeck(uid, name, deckCache = null) {
  // 若有傳入 cache 就直接查，避免重複讀 Firestore
  if (deckCache && deckCache[name]) return deckCache[name];
  const snap = await getDocs(collection(db, "users", uid, "decks"));
  const existing = snap.docs.find(d => d.data().name === name);
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, "users", uid, "decks"), { name, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteDeck(uid, deckId) {
  const cards = await getCards(uid, deckId);
  const BATCH_SIZE = 500;
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    cards.slice(i, i + BATCH_SIZE).forEach(c => {
      batch.delete(doc(db, "users", uid, "cards", c.id));
      batch.delete(doc(db, "users", uid, "progress", c.id));
    });
    await batch.commit();
  }
  await deleteDoc(doc(db, "users", uid, "decks", deckId));
}

// ── Cards ──────────────────────────────────────────

export async function addCard(uid, card) {
  return addDoc(collection(db, "users", uid, "cards"), {
    ...card,
    createdAt: serverTimestamp()
  });
}

export async function getCards(uid, deckId = null) {
  // 用 where 在 Firestore 過濾，不抓全部再 client filter
  const col = collection(db, "users", uid, "cards");
  const q = deckId
    ? query(col, where("deckId", "==", deckId), orderBy("createdAt", "desc"))
    : query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteCard(uid, cardId) {
  await deleteDoc(doc(db, "users", uid, "cards", cardId));
  await deleteDoc(doc(db, "users", uid, "progress", cardId));
}

// ── Progress ───────────────────────────────────────

export async function getProgress(uid, deckId = null, knownCards = null) {
  // 用 sessionStorage 快取，同一個 session 不重複讀 Firestore
  const cacheKey = `progress_${uid}_${deckId || "all"}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  let map = {};
  if (deckId) {
    // 用傳入的 cards 避免重複讀，沒有才自己查
    const cards = knownCards || await getCards(uid, deckId);
    if (cards.length) {
      for (let i = 0; i < cards.length; i += 30) {
        const ids = cards.slice(i, i + 30).map(c => c.id);
        const snap = await getDocs(query(
          collection(db, "users", uid, "progress"),
          where("__name__", "in", ids)
        ));
        snap.docs.forEach(d => { map[d.id] = d.data(); });
      }
    }
  } else {
    const snap = await getDocs(collection(db, "users", uid, "progress"));
    snap.docs.forEach(d => { map[d.id] = d.data(); });
  }

  sessionStorage.setItem(cacheKey, JSON.stringify(map));
  return map;
}

export async function saveProgress(uid, cardId, data) {
  await setDoc(doc(db, "users", uid, "progress", cardId), data, { merge: true });
  // 更新 sessionStorage cache
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(`progress_${uid}`)) {
      try {
        const cached = JSON.parse(sessionStorage.getItem(key));
        cached[cardId] = data;
        sessionStorage.setItem(key, JSON.stringify(cached));
      } catch {}
    }
  }
}

// ── CSV Import ─────────────────────────────────────

export async function importCSV(uid, csvText, onProgress) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  const allCards = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values.length) continue;
    const card = {};
    headers.forEach((h, idx) => { card[h] = values[idx]?.trim() || ""; });
    if (!card.front) continue;
    card._deckName = card.deck || "預設牌組";
    delete card.deck;
    card.tags = card.tags ? card.tags.split(";").map(t => t.trim()).filter(Boolean) : [];
    allCards.push(card);
  }

  // 一次讀取所有現有牌組，建立 cache，避免每個牌組名稱都查一次 Firestore
  const existingDecks = await getDecks(uid);
  const deckCache = {};
  existingDecks.forEach(d => { deckCache[d.name] = d.id; });

  // 建立新牌組（只建立 cache 裡沒有的）
  const newDeckNames = [...new Set(allCards.map(c => c._deckName))].filter(n => !deckCache[n]);
  for (const name of newDeckNames) {
    const ref = await addDoc(collection(db, "users", uid, "decks"), { name, createdAt: serverTimestamp() });
    deckCache[name] = ref.id;
  }

  // 分批寫入
  const BATCH_SIZE = 200;
  let count = 0;
  for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
    const chunk = allCards.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const card of chunk) {
      card.deckId = deckCache[card._deckName];
      delete card._deckName;
      card.createdAt = serverTimestamp();
      batch.set(doc(collection(db, "users", uid, "cards")), card);
      count++;
    }
    await batch.commit();
    if (onProgress) onProgress(count, allCards.length);
    await new Promise(r => setTimeout(r, 500));
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
