const { adminDb } = require('../../../lib/firebase-admin');
import { fetchFootball } from '../../../lib/apiFootball';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing bet code' });

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // Since betCode IS the Firestore document ID, fetch directly by ID (fast)
    const directDoc = await adminDb.collection('tickets').doc(code.toUpperCase()).get();
    let ticket = null;

    if (directDoc.exists) {
      ticket = directDoc.data();
    } else {
      // Fallback: query by betCode field (handles old TX... style codes)
      const snapshot = await adminDb.collection('tickets')
        .where('betCode', '==', code.toUpperCase())
        .limit(1)
        .get();
      if (!snapshot.empty) {
        ticket = snapshot.docs[0].data();
      }
    }

    if (!ticket) {
      return res.status(404).json({ 
        error: 'This ticket is expired — at least one game has already started.',
        expired: true
      });
    }
    const bets = ticket.bets || [];

    if (bets.length === 0) {
      return res.status(200).json({ success: true, bets: [], expired: false });
    }

    // Check if any of the matches have finished
    const matchIds = bets.map(b => b.matchId).join('-');
    const fixturesRes = await fetchFootball(`/fixtures?ids=${matchIds}`, 60);
    
    const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
    // Statuses that mean the match has NOT started yet
    const notStartedStatuses = ['NS', 'TBD', 'CANC', 'PST', 'SUSP', 'INT', 'ABD'];
    let hasStartedGame = false;
    let expiredReason = '';

    if (fixturesRes.response && !fixturesRes.error) {
      for (const fixture of fixturesRes.response) {
        const status = fixture.fixture?.status?.short;
        if (!notStartedStatuses.includes(status)) {
          hasStartedGame = true;
          if (finishedStatuses.includes(status)) {
            expiredReason = 'This ticket code is expired — some games have already finished.';
          } else {
            expiredReason = 'This ticket code cannot be loaded — at least one game has already started.';
          }
          break;
        }
      }
    }

    if (hasStartedGame) {
      return res.status(200).json({ 
        success: true, 
        bets: [],
        expired: true,
        message: expiredReason
      });
    }

    return res.status(200).json({ 
      success: true, 
      bets,
      expired: false
    });

  } catch (err) {
    console.error('Load ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
