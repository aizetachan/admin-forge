<p align="center">
  <strong>🔧 Admin Forge</strong>
</p>

<h1 align="center">Admin Forge</h1>

<p align="center">
  <strong>Centralized master administration panel for managing users and platform access across the UI Forge ecosystem.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-12-DD2C00?logo=firebase&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Firestore Security Rules](#firestore-security-rules)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Relationship with UI Forge](#relationship-with-ui-forge)

---

## Overview

**Admin Forge** is the master administration web application for the UI Forge platform. It is a standalone web app deployed to Firebase Hosting that allows **master administrators** to:

- View all registered users across the platform.
- Approve or reject user access requests.
- Assign roles (`admin`, `user`) to control access levels.
- Revoke previously granted access.

This application is separate from the UI Forge desktop app and serves as the centralized control point for all platform-wide user management.

---

## Features

| Feature                    | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| 🔐 **Google Sign-In**     | Firebase Authentication with Google provider.                              |
| 👑 **Master Admin Guard** | Only users with `master_admin` role in Firestore can access the dashboard. |
| 👥 **User Table**         | Lists all registered users with avatar, name, email, role, and status.     |
| ✅ **Approve / Reject**   | One-click approval or rejection of pending users.                          |
| 🔄 **Role Management**   | Change user roles between `user` and `admin` via dropdown.                 |
| 🚫 **Revoke Access**     | Remove access from previously approved users.                              |
| 🌙 **Dark Theme**        | Professional dark UI matching the UI Forge aesthetic.                       |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Admin Forge (Web App)                      │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │                    App.tsx                          │     │
│   │                                                    │     │
│   │  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │     │
│   │  │  Auth State   │  │  User List │  │  Actions  │  │     │
│   │  │  (Firebase)   │  │  (Firestore│  │  Approve/ │  │     │
│   │  │  Google SSO   │  │   query)   │  │  Reject/  │  │     │
│   │  │              │  │            │  │  Roles    │  │     │
│   │  └──────┬───────┘  └──────┬─────┘  └─────┬─────┘  │     │
│   └─────────┼─────────────────┼───────────────┼────────┘     │
│             │                 │               │              │
├─────────────┼─────────────────┼───────────────┼──────────────┤
│             ▼                 ▼               ▼              │
│   ┌─────────────────────────────────────────────────────┐    │
│   │                 Firebase Services                    │    │
│   │                                                     │    │
│   │  ┌─────────────────┐    ┌────────────────────────┐  │    │
│   │  │  Authentication │    │   Cloud Firestore      │  │    │
│   │  │  Google Sign-In │    │   /users collection    │  │    │
│   │  │                 │    │   - name, email, role  │  │    │
│   │  │                 │    │   - status, avatarUrl  │  │    │
│   │  └─────────────────┘    └────────────────────────┘  │    │
│   └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### User Flow

1. **Sign In** → User signs in with Google via Firebase Auth.
2. **Role Check** → App reads the user's document from `users/{uid}` in Firestore.
3. **Access Guard** → If role is NOT `master_admin`, a denial screen is shown.
4. **Dashboard** → Master admins see the full user table with management controls.

### User Status Lifecycle

```
  ┌─────────┐    Approve    ┌──────────┐    Revoke     ┌──────────┐
  │ pending │──────────────▶│ approved │──────────────▶│ rejected │
  └─────────┘               └──────────┘               └──────────┘
       │                          ▲                         │
       │         Reject           │      Restore            │
       └──────────────────────────┼─────────────────────────┘
                                  │
                           (can be restored)
```

---

## Project Structure

```
admin-forge/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main application (auth + user management)
│   ├── App.css               # Component-specific styles
│   ├── index.css             # Global styles (Tailwind imports)
│   └── assets/               # Static assets (logos, icons)
│
├── public/
│   └── vite.svg              # Favicon
│
├── firebase.json             # Firebase Hosting configuration
├── .firebaserc               # Firebase project alias
├── firestore.rules           # Firestore security rules
│
├── index.html                # HTML entry point
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
├── eslint.config.js          # ESLint configuration
├── tsconfig.json             # TypeScript config (root)
├── tsconfig.app.json         # TypeScript config (app)
└── tsconfig.node.json        # TypeScript config (Node/Vite)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Firebase CLI** (`npm install -g firebase-tools`)

### Installation

```bash
git clone https://github.com/aizetachan/admin-forge.git
cd admin-forge
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173` (or the next available port).

### Production Build

```bash
npm run build
```

Outputs the production bundle to `dist/`.

---

## Firebase Setup

Admin Forge requires a Firebase project with:

1. **Authentication** → Enable the Google sign-in provider.
2. **Cloud Firestore** → Create a database in production mode.

### Initial Master Admin

To bootstrap the first master admin, manually create a document in Firestore:

```
Collection: users
Document ID: <your-firebase-uid>
Fields:
  - name: "Your Name"
  - email: "your@email.com"
  - role: "master_admin"
  - status: "approved"
```

> 💡 You can find your Firebase UID by signing into the app once (it will show the access denied page) and checking the Firebase Console → Authentication → Users.

---

## Firestore Security Rules

The included `firestore.rules` implements role-based access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isMasterAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master_admin';
    }

    match /users/{userId} {
      allow read:   if request.auth != null && (request.auth.uid == userId || isMasterAdmin());
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && (request.auth.uid == userId || isMasterAdmin());
      allow delete: if isMasterAdmin();
    }
  }
}
```

**Key rules:**
- Users can read and update **their own** profile.
- Only `master_admin` users can read **all** profiles, update **any** profile, or delete users.
- Any authenticated user can create their initial profile document.

Deploy rules with:
```bash
firebase deploy --only firestore:rules
```

---

## Deployment

Deploy to Firebase Hosting:

```bash
npm run build
firebase deploy --only hosting
```

The app is hosted at your Firebase Hosting URL (configured in `.firebaserc`).

---

## Tech Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Framework  | React 19 + TypeScript 5.9       |
| Build Tool | Vite 6                           |
| Styling    | Tailwind CSS 4                   |
| Auth       | Firebase Authentication (Google) |
| Database   | Cloud Firestore                  |
| Icons      | lucide-react                     |
| Hosting    | Firebase Hosting                 |
| Linting    | ESLint 9                         |

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> ⚠️ Never commit `.env.local` to version control. It is already in `.gitignore`.

---

## Relationship with UI Forge

```
┌─────────────────────┐         ┌──────────────────────┐
│    UI Forge          │         │   Admin Forge        │
│    (Desktop App)     │         │   (Web App)          │
│                      │         │                      │
│  • Component editor  │         │  • User management   │
│  • CSS live editing  │         │  • Role assignment   │
│  • Git integration   │         │  • Access control    │
│  • AI assistant      │         │  • Platform admin    │
│                      │         │                      │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └──────────┬─────────────────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │   Firebase Backend   │
           │                      │
           │  • Authentication    │
           │  • Cloud Firestore   │
           │  • users collection  │
           └──────────────────────┘
```

Both applications share the same Firebase project:
- **UI Forge** authenticates users and creates their profile in Firestore.
- **Admin Forge** manages those user profiles (approve, reject, assign roles).

They are maintained as separate repositories for independent versioning and deployment:
- [`ui-forge`](https://github.com/aizetachan/ui-forge) — Desktop application
- [`admin-forge`](https://github.com/aizetachan/admin-forge) — This repository

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/aizetachan">aizetachan</a>
</p>
