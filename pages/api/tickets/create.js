const { adminDb, admin } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const { userId, stake, bets, totalOdds, potentialWin } = req.body;

  if (!userId || !stake || !bets || bets.length === 0) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const numStake = parseFloat(stake);
  if (isNaN(numStake) || numStake <= 0) {
    return res.status(400).json({ error: 'Invalid stake amount' });
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);

    // Pre-generate the document reference so its auto-ID becomes the betCode
    const ticketRef = adminDb.collection('tickets').doc();
    const betCode = ticketRef.id;

    // Run a transaction to safely check balance, deduct it, and create the ticket
    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentBalance = userData.balance || 0;

      if (currentBalance < numStake) {
        throw new Error('Insufficient balance');
      }

      // Deduct balance
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(-numStake)
      });

      // Create ticket — the document ID IS the betCode
      transaction.set(ticketRef, {
        userId,
        stake: numStake,
        bets,
        totalOdds,
        potentialWin,
        betCode,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Bet placed successfully',
      betCode 
    });

  } catch (err) {
    console.error('Ticket creation error:', err);
    if (err.message === 'Insufficient balance' || err.message === 'User not found') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
