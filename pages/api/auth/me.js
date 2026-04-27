const { adminAuth } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    
    // Extract phone from email (251... @gmail.com)
    let phoneNumber = '';
    if (email.includes('@')) {
      phoneNumber = email.split('@')[0];
    }

    res.status(200).json({ 
      success: true, 
      uid, 
      phoneNumber 
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
}
