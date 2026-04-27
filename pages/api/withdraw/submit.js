const { adminDb, admin } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { userId, amount, methodId, details } = req.body;
  
  if (!userId || !amount || !methodId || !details) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const withdrawalAmount = Number(amount);
  if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const methodRef = adminDb.collection('withdrawal_methods').doc(methodId);
    
    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const methodDoc = await transaction.get(methodRef);

      if (!userDoc.exists) throw new Error('User not found');
      if (!methodDoc.exists) throw new Error('Withdrawal method not found');

      const userData = userDoc.data();
      const methodData = methodDoc.data();

      // 1. Check pending withdrawals
      const pendingSnapshot = await adminDb.collection('withdrawals')
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
      
      if (!pendingSnapshot.empty) {
        throw new Error('You already have a pending withdrawal request.');
      }

      // 2. Check minimum withdrawal
      if (withdrawalAmount < (methodData.minWithdrawal || 1000)) {
        throw new Error(`Minimum withdrawal for ${methodData.name} is ${methodData.minWithdrawal} Birr`);
      }

      // 3. Check balance
      if (userData.balance < withdrawalAmount) {
        throw new Error('Insufficient balance');
      }

      // 4. Create withdrawal record
      const withdrawalRef = adminDb.collection('withdrawals').doc();
      const withdrawalData = {
        userId,
        phoneNumber: userData.phoneNumber || '',
        amount: withdrawalAmount,
        methodId,
        methodName: methodData.name,
        methodType: methodData.type,
        details, // { fullName, accountNumber } or { fullName, phoneNumber }
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: methodData.description || 'Processing'
      };

      transaction.set(withdrawalRef, withdrawalData);

      // 5. Deduct balance
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(-withdrawalAmount)
      });

      return { success: true, id: withdrawalRef.id };
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(400).json({ error: err.message });
  }
}
