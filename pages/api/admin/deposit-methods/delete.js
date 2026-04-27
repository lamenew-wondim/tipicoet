const { adminDb } = require('../../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.query;
  
  if (!adminDb) {
    return res.status(500).json({ error: 'Firebase Admin not initialized' });
  }

  try {
    await adminDb.collection('deposit_methods').doc(id).delete();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete deposit method' });
  }
}
