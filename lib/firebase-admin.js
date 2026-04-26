const admin = require('firebase-admin');

let serviceAccount;

try {
  // Try to load from environment variable first (Vercel/Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file for development - use eval to prevent Turbopack build-time resolution
    try {
      const localRequire = eval('require');
      serviceAccount = localRequire('../tipico.json');
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }
} catch (error) {
  console.warn('Firebase Service Account not found. Ensure FIREBASE_SERVICE_ACCOUNT is set in environment variables.');
}

if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else if (!serviceAccount) {
  console.warn('Firebase Admin skipped initialization: No service account credentials provided.');
}

const adminDb = admin.apps.length ? admin.firestore() : null;
const adminAuth = admin.apps.length ? admin.auth() : null;

module.exports = { adminDb, adminAuth, admin };

