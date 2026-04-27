const { adminDb } = require('../../../lib/firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing bet code' });

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // Try direct doc ID lookup first (fast - new style codes are Firestore IDs)
    const directDoc = await adminDb.collection('tickets').doc(code.trim()).get();
    let ticket = null;
    let ticketId = null;

    if (directDoc.exists) {
      ticket = directDoc.data();
      ticketId = directDoc.id;
    } else {
      // Fallback: query by betCode field (old TX... style codes)
      const snapshot = await adminDb.collection('tickets')
        .where('betCode', '==', code.trim().toUpperCase())
        .limit(1)
        .get();
      if (!snapshot.empty) {
        ticket = snapshot.docs[0].data();
        ticketId = snapshot.docs[0].id;
      }
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found. Please check your bet code.' });
    }

    // Return the full ticket including bets (with per-bet results already stored by settle.js)
    return res.status(200).json({
      success: true,
      ticket: {
        id: ticketId,
        betCode: ticket.betCode || code.trim(),
        status: ticket.status || 'pending',
        bets: ticket.bets || [],
        stake: ticket.stake,
        totalOdds: ticket.totalOdds,
        potentialWin: ticket.potentialWin,
        createdAt: ticket.createdAt?._seconds 
          ? new Date(ticket.createdAt._seconds * 1000).toISOString() 
          : ticket.createdAt
      }
    });

  } catch (err) {
    console.error('Check ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
