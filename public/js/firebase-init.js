import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAsdbCJ0vXaLAMmGmxpGkXz4Zd_OR4wzAA',
  authDomain: 'wellnessplpy.firebaseapp.com',
  projectId: 'wellnessplpy',
  storageBucket: 'wellnessplpy.firebasestorage.app',
  messagingSenderId: '793276474494',
  appId: '1:793276474494:web:2a0591af677fd511f6242f',
  measurementId: 'G-WTGQMNEK28'
};

const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      window.firebaseAnalytics = getAnalytics(app);
    }
  })
  .catch(() => {
    // Analytics is optional and can be unavailable in unsupported browser contexts.
  });

window.firebaseApp = app;
