const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { status } = req.query;

  try {
    if (!adminDb) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    let query = adminDb.collection('tickets');
    
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?._seconds ? doc.data().createdAt._seconds * 1000 : Date.now()
    }));

    res.status(200).json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
