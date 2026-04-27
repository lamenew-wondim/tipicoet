const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { userId } = req.query;
  
  if (!adminDb) return res.status(500).json({ error: 'Firebase Admin not initialized' });

  try {
    const snapshot = await adminDb.collection('deposits')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
      
    res.status(200).json({ 
      hasPending: !snapshot.empty 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check pending deposits' });
  }
}
