const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    if (!adminDb) return res.status(500).json({ error: 'DB error' });

    const snapshot = await adminDb.collection('tickets')
      .where('status', '==', 'pending')
      .get();
    
    res.status(200).json({ success: true, count: snapshot.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
