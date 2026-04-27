const { adminDb, admin } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Withdrawal ID required' });

  try {
    const withdrawalRef = adminDb.collection('withdrawals').doc(id);
    const withdrawalDoc = await withdrawalRef.get();
    
    if (!withdrawalDoc.exists) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    if (withdrawalDoc.data().status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    await withdrawalRef.update({
      status: 'verified',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
