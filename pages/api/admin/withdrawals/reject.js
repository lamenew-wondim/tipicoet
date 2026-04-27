const { adminDb, admin } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { id, reason } = req.body;
  if (!id) return res.status(400).json({ error: 'Withdrawal ID required' });

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const withdrawalRef = adminDb.collection('withdrawals').doc(id);
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) throw new Error('Withdrawal not found');
      
      const wData = withdrawalDoc.data();
      if (wData.status !== 'pending') throw new Error('Withdrawal already processed');

      const userRef = adminDb.collection('users').doc(wData.userId);

      // Refund balance
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(wData.amount)
      });

      // Update status to rejected
      transaction.update(withdrawalRef, {
        status: 'rejected',
        rejectionReason: reason || 'Invalid details',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
