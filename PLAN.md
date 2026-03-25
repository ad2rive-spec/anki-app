# Anki-like Web App — 開發計畫

## 架構概覽

```
Firebase (單一專案)
    ↑                    ↑
Web App              Chrome Extension
(複習 / 管理 / 匯入)   (瀏覽網頁時快速加字)
```

## 技術選擇

| 項目 | 選擇 | 說明 |
|------|------|------|
| Hosting | GitHub Pages | 免費靜態托管 |
| 登入 | Firebase Auth (Google) | 一鍵 Google 登入 |
| 資料庫 | Firebase Firestore | 跨裝置同步，免費額度夠用 |
| TTS | Web Speech API | 瀏覽器內建，免費無 key |
| 複習演算法 | SM-2 | Anki 同款開源演算法 |
| 框架 | 純 HTML/JS | 不需要 build step，GitHub Pages 直接部署 |

## Firestore 資料結構

```
users/
  {uid}/
    cards/
      {cardId}:
        front: "hello"
        back: "你好"
        sentence: "Hello, how are you?"
        tags: ["日常", "問候"]
        createdAt: timestamp
    progress/
      {cardId}:
        interval: 1          # 下次複習間隔（天）
        easeFactor: 2.5      # 難易度係數
        nextReview: timestamp
        reps: 0              # 複習次數
```

## 功能清單

### Web App
- [ ] Google 登入 / 登出
- [ ] 單字卡複習（SM-2 演算法）
- [ ] TTS 朗讀單字和例句（Web Speech API）
- [ ] 新增單字（表單）
- [ ] 匯入 CSV（批次寫入 Firestore）
- [ ] 單字管理（列表、編輯、刪除）
- [ ] 標籤篩選

### Chrome Extension
- [ ] Google 登入（chrome.identity）
- [ ] 選取網頁文字 → 右鍵「加入單字卡」
- [ ] 彈出視窗確認 front / back / 例句
- [ ] 直接存入 Firestore（同一個專案）

## Firebase 設定步驟

1. 建立 Firebase 專案（[console.firebase.google.com](https://console.firebase.google.com)）
2. Authentication → Google 登入 → 啟用
3. Firestore Database → 建立（測試模式）→ 地區 `asia-east1`
4. 新增 Web App → 複製 firebaseConfig
5. Google Cloud Console → 憑證 → 複製 Web client ID（Chrome Extension 用）

## 待確認

- [ ] CSV 欄位格式（front, back, sentence, tags...）
- [x] Firebase firebaseConfig（已取得）
- [ ] Chrome Extension OAuth Web client ID

## Firebase Config

```js
const firebaseConfig = {
  apiKey: "AIzaSyAP3SYexReWgSp6XWA7z4RhO_J7vNZG_ew",
  authDomain: "anki-app-93667.firebaseapp.com",
  projectId: "anki-app-93667",
  storageBucket: "anki-app-93667.firebasestorage.app",
  messagingSenderId: "936944076604",
  appId: "1:936944076604:web:623bef63683fbac5d44039"
};
```

## CSV 匯入預計格式

```
front,back,sentence,tags
hello,你好,Hello how are you?,日常;問候
world,世界,The world is beautiful.,名詞
```

- `tags` 用分號分隔多個標籤
- `sentence` 可留空
