/**
 * firebase-config.js
 * ─────────────────────────────────────────────────────────────
 * STEP 1: Go to https://console.firebase.google.com
 *         → Your Project → Project Settings → Your Apps → Web App
 *         → Copy the firebaseConfig object and paste it below.
 *
 * STEP 2: Enable Firestore Database in your Firebase console.
 *
 * STEP 3: Enable Anonymous Authentication:
 *         Firebase Console → Authentication → Sign-in method → Anonymous → Enable
 * ─────────────────────────────────────────────────────────────
 */

// ── Wellness Medicals Firebase Project Config ────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAsdbCJ0vXaLAMmGmxpGkXz4Zd_OR4wzAA",
  authDomain:        "wellnessplpy.firebaseapp.com",
  projectId:         "wellnessplpy",
  storageBucket:     "wellnessplpy.firebasestorage.app",
  messagingSenderId: "793276474494",
  appId:             "1:793276474494:web:2a0591af677fd511f6242f",
  measurementId:     "G-WTGQMNEK28"
};

// ── Bootstrap Firebase ──────────────────────────────────────────
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Persistent Firestore cache for offline resilience
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('HMS: Firestore persistence unavailable (multiple tabs open).');
    } else if (err.code === 'unimplemented') {
      console.warn('HMS: Browser does not support Firestore offline persistence.');
    }
  });

// No authentication system active
window._firebaseAuthReady = true;
setTimeout(() => {
  document.dispatchEvent(new Event('hms:firebase-ready'));
}, 0);

// Expose globally for firebase-api.js
window.db = db;
