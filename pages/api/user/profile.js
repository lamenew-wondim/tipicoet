const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(200).json({ 
        success: true, 
        balance: 0,
        message: 'No user record found, default balance applied'
      });
    }

    const userData = userDoc.data();
    return res.status(200).json({ 
      success: true, 
      balance: userData.balance || 0,
      role: userData.role || 'user'
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
