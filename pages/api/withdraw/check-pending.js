const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    const snapshot = await adminDb.collection('withdrawals')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    res.status(200).json({ hasPending: !snapshot.empty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
