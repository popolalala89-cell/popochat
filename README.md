# Chat Internal — Aplikasi Broadcast Anti-Bosan

Aplikasi chat internal untuk Android, built with React + Ionic + Capacitor + Firebase.

## 🚀 Quick Start

### 1. Setup Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Buat project baru (atau pakai project yang sudah ada)
3. Enable **Authentication** → Sign-in method → **Email/Password**
4. Enable **Cloud Firestore** → buat database (start in test mode dulu)
5. **Storage** → enable (default rules)
6. **Cloud Messaging** → enable (untuk push notifications nanti)
7. Di **Project Settings** → **General** → buat **Web App**
8. Copy config ke `src/firebase/config.ts`

### 2. Install & Run

```bash
npm install
npm run dev
```

Buka http://localhost:8100

### 3. Build APK

```bash
npm run build        # build web
npx cap sync android # sync ke Capacitor
# Buka android/ di Android Studio, build APK
```

Atau push ke GitHub → Actions otomatis build APK.

## 📁 Struktur Proyek

```
src/
├── firebase/config.ts   # Firebase setup
├── contexts/            # AuthContext
├── pages/
│   ├── LoginPage.tsx     # Halaman login
│   ├── RegisterPage.tsx  # Halaman daftar
│   ├── ChatListPage.tsx  # Daftar grup chat
│   ├── ChatDetailPage.tsx# Layar chat
│   ├── BroadcastPage.tsx # Kirim broadcast
│   └── ProfilePage.tsx   # Profil & pengaturan
├── components/          # Shared components
├── types/index.ts       # TypeScript types
└── theme/variables.css  # CSS tema
```

## 🔔 Notifikasi Push (FCM)

**MVP:** Notifikasi dikirim dari client setelah pesan ditulis.

**Nanti (Blaze plan):** Cloud Functions akan handle broadcast notification ke semua anggota grup.

### Setup Suara Notifikasi

Taruh file .mp3/.ogg di `android/app/src/main/res/raw/`, lalu pilih dari profil.

## 🔧 Firestore Rules (untuk development)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /groups/{groupId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow write: if request.auth != null;
    }
    match /messages/{message} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 📱 Build dengan GitHub Actions

Push ke branch `main` → otomatis build APK di Actions → download artifact.
