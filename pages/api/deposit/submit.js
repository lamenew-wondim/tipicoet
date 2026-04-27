const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { userId, phoneNumber, amount, methodId, proofUrl } = req.body;
  
  if (!adminDb) return res.status(500).json({ error: 'Firebase Admin not initialized' });

  try {
    const docRef = await adminDb.collection('deposits').add({
      userId,
      phoneNumber,
      amount: Number(amount),
      methodId,
      proofUrl,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    res.status(200).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit deposit request' });
  }
}
