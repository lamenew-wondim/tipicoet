
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { idToken, newPassword } = req.body;
  const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  if (!FIREBASE_API_KEY) return res.status(500).json({ error: "Missing Firebase Config" });
  if (!idToken) return res.status(401).json({ error: "Unauthorized" });

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken, 
        password: newPassword, 
        returnSecureToken: true 
      })
    });
    
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.error.message });

    res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
}
