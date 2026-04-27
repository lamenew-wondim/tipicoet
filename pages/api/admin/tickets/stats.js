const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    if (!adminDb) return res.status(500).json({ error: 'DB error' });

    const snapshot = await adminDb.collection('tickets').get();
    
    const stats = {
      won: 0,
      lost: 0,
      pending: 0,
      all: snapshot.size
    };

    snapshot.forEach(doc => {
      const status = doc.data().status?.toLowerCase();
      if (stats[status] !== undefined) {
        stats[status]++;
      }
    });

    res.status(200).json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
