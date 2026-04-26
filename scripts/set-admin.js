const admin = require('firebase-admin');
const serviceAccount = require('../tipico.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function setAdmin(email) {
  if (!email) {
    console.error('Please provide an email: node scripts/set-admin.js user@example.com');
    process.exit(1);
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      console.log(`User with email ${email} not found in Firestore. Creating a new record...`);
      // We don't have the UID here, so we'll just create a doc with email as ID or random ID
      // Usually it's better to find by UID from Auth, but the user said "admin email set as admin"
      await usersRef.add({
        email: email,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    } else {
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({ role: 'admin' });
      console.log(`User ${email} updated to role: admin`);
    }
    
    console.log('Success!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting admin:', error);
    process.exit(1);
  }
}

const email = process.argv[2];
setAdmin(email);
