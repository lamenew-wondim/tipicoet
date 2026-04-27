const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body;
  
  if (!adminDb) return res.status(500).json({ error: 'Firebase Admin not initialized' });

  try {
    const depositRef = adminDb.collection('deposits').doc(id);
    const depositDoc = await depositRef.get();
    
    if (!depositDoc.exists) return res.status(404).json({ error: 'Deposit not found' });
    const depositData = depositDoc.data();
    
    if (depositData.status !== 'pending') return res.status(400).json({ error: 'Deposit already processed' });

    const { userId, phoneNumber, amount } = depositData;
    const userRef = adminDb.collection('users').doc(userId);

    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      let currentBalance = 0;
      
      if (userDoc.exists) {
        currentBalance = userDoc.data().balance || 0;
      }

      const newBalance = currentBalance + Number(amount);

      // 1. Update/Create User
      transaction.set(userRef, {
        uid: userId,
        phoneNumber: phoneNumber,
        balance: newBalance,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update Deposit Status
      transaction.update(depositRef, {
        status: 'verified',
        verifiedAt: new Date().toISOString()
      });
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept deposit' });
  }
}
