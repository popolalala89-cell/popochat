# Cara Buat Index Firestore untuk Popochat

## Lewat Firebase Console

1. Buka: **https://console.firebase.google.com/project/popochat-1eaef/firestore/indexes**

2. Klik tombol **"Add Index"** (pojok kanan atas)

3. Isi form Index 1:
   - **Collection:** ketik `messages`
   - **Fields:**
     - Field: `groupId` → Order: **Ascending**
     - Klik **"Add Field"** → Field: `timestamp` → Order: **Ascending**
   - Klik **"Create"**

4. Tunggu 1-2 menit sampai status jadi **Enabled** ✅

5. Ulangi untuk Index 2:
   - Klik **"Add Index"**
   - **Collection:** `messages`
   - **Fields:**
     - `groupId` → **Ascending**
     - `timestamp` → **Descending** (beda!)
   - Klik **"Create"**

## Setelah selesai
Refresh browser di HP (localhost:8100) — chat loading langsung cepet ⚡
