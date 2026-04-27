const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    // Fetch deposits
    const depositsSnap = await adminDb.collection('deposits')
      .where('userId', '==', userId)
      .get();
    const deposits = depositsSnap.docs.map(doc => ({
      id: doc.id,
      type: 'deposit',
      ...doc.data(),
      date: doc.data().createdAt?._seconds ? doc.data().createdAt._seconds * 1000 : Date.now()
    }));

    // Fetch withdrawals
    const withdrawalsSnap = await adminDb.collection('withdrawals')
      .where('userId', '==', userId)
      .get();
    const withdrawals = withdrawalsSnap.docs.map(doc => ({
      id: doc.id,
      type: 'withdrawal',
      ...doc.data(),
      date: doc.data().createdAt?._seconds ? doc.data().createdAt._seconds * 1000 : Date.now()
    }));

    // Combine and sort
    const transactions = [...deposits, ...withdrawals].sort((a, b) => b.date - a.date);

    res.status(200).json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
