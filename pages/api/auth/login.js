const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  if (!FIREBASE_API_KEY) return res.status(500).json({ error: "Missing Firebase Config" });

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.error.message });

    // Check user role in Firestore
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    let role = 'user';
    
    if (!snapshot.empty) {
      role = snapshot.docs[0].data().role || 'user';
    }

    res.status(200).json({ ...data, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
}
