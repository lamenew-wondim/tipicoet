const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const ticketsRef = adminDb.collection('tickets');
    // Query tickets for this user, ordered by creation date descending
    const snapshot = await ticketsRef
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      tickets.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    return res.status(200).json({ success: true, tickets });
  } catch (err) {
    console.error('Fetch history error:', err);
    // If the index is missing, Firestore throws an error. 
    // Fallback: fetch all for user and sort in memory.
    if (err.message && err.message.includes('index')) {
      try {
        const snapshot = await adminDb.collection('tickets')
          .where('userId', '==', userId)
          .get();
        
        let tickets = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          tickets.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
          });
        });
        
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.status(200).json({ success: true, tickets });
      } catch (fallbackErr) {
        console.error('Fallback fetch error:', fallbackErr);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
