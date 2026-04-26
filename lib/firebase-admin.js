const admin = require('firebase-admin');
const serviceAccount = require('../tipico.json');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

module.exports = { adminDb, adminAuth, admin };
