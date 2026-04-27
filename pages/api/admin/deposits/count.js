const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  if (!adminDb) return res.status(500).json({ error: 'Firebase Admin not initialized' });

  try {
    const snapshot = await adminDb.collection('deposits')
      .where('status', '==', 'pending')
      .get();
      
    res.status(200).json({ success: true, count: snapshot.size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending count' });
  }
}
