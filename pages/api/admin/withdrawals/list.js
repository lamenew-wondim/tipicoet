const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  if (!adminDb) return res.status(500).json({ error: 'DB error' });

  try {
    const snapshot = await adminDb.collection('withdrawals').orderBy('createdAt', 'desc').get();
    const withdrawals = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?._seconds ? new Date(doc.data().createdAt._seconds * 1000).toISOString() : doc.data().createdAt
    }));
    res.status(200).json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
