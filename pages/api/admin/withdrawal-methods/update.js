const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).end();
  const { id, methodData } = req.body;
  
  if (!adminDb) return res.status(500).json({ error: 'Firebase Admin not initialized' });

  try {
    await adminDb.collection('withdrawal_methods').doc(id).update({
      ...methodData,
      updatedAt: new Date().toISOString()
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update withdrawal method' });
  }
}
