const { adminDb, admin } = require('../../../lib/firebase-admin');
import { fetchFootball } from '../../../lib/apiFootball';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // 1. Fetch pending tickets for this user
    const pendingTicketsSnapshot = await adminDb.collection('tickets')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    if (pendingTicketsSnapshot.empty) {
      return res.status(200).json({ success: true, message: 'No pending tickets to settle' });
    }

    const tickets = [];
    const matchIds = new Set();
    
    pendingTicketsSnapshot.forEach(doc => {
      const t = { id: doc.id, ...doc.data() };
      tickets.push(t);
      if (t.bets) {
        t.bets.forEach(b => matchIds.add(b.matchId));
      }
    });

    if (matchIds.size === 0) {
      return res.status(200).json({ success: true });
    }

    // 2. Fetch latest match results
    const idsString = Array.from(matchIds).join('-');
    const fixturesRes = await fetchFootball(`/fixtures?ids=${idsString}`, 60); // 1 min cache
    
    if (!fixturesRes.response || fixturesRes.error) {
      throw new Error('Failed to fetch fixtures from API');
    }

    // Map matchId -> actual outcome (only for finished matches)
    const matchResults = {};
    fixturesRes.response.forEach(f => {
      const status = f.fixture.status.short;
      if (['FT', 'AET', 'PEN'].includes(status)) {
        const homeGoals = f.goals.home;
        const awayGoals = f.goals.away;
        let outcome = 'draw';
        if (homeGoals > awayGoals) outcome = 'home';
        else if (awayGoals > homeGoals) outcome = 'away';
        matchResults[f.fixture.id] = outcome;
      }
    });

    const updates = [];

    // 3. Evaluate each ticket
    for (const ticket of tickets) {
      let isLost = false;
      let isPending = false;

      // Build updated bets array with per-bet results
      const updatedBets = ticket.bets.map(bet => {
        const actualOutcome = matchResults[bet.matchId];
        if (!actualOutcome) {
          // Match hasn't finished yet — keep pending
          return { ...bet, result: 'pending' };
        }
        const betResult = bet.selection === actualOutcome ? 'won' : 'lost';
        return { ...bet, result: betResult };
      });

      for (const bet of updatedBets) {
        if (bet.result === 'pending') {
          isPending = true;
        } else if (bet.result === 'lost') {
          isLost = true;
          break; // One loss = whole ticket lost
        }
      }

      if (isLost) {
        updates.push({ id: ticket.id, status: 'lost', bets: updatedBets });
      } else if (!isPending) {
        // All matches finished with no losses -> Won
        updates.push({ 
          id: ticket.id, 
          status: 'won', 
          potentialWin: ticket.potentialWin,
          bets: updatedBets
        });
      } else {
        // Still some pending matches — only update the bets array with partial results
        updates.push({ id: ticket.id, status: 'pending', bets: updatedBets });
      }
    }

    // 4. Execute Firestore updates
    if (updates.length > 0) {
      for (const update of updates) {
        const ticketRef = adminDb.collection('tickets').doc(update.id);
        
        if (update.status === 'won') {
          const userRef = adminDb.collection('users').doc(userId);
          await adminDb.runTransaction(async (transaction) => {
            const tDoc = await transaction.get(ticketRef);
            if (!tDoc.exists || tDoc.data().status !== 'pending') return;
            transaction.update(ticketRef, { status: 'won', bets: update.bets });
            transaction.update(userRef, {
              balance: admin.firestore.FieldValue.increment(update.potentialWin)
            });
          });
        } else if (update.status === 'lost') {
          await ticketRef.update({ status: 'lost', bets: update.bets });
        } else {
          // Partially settled — update bets array only
          await ticketRef.update({ bets: update.bets });
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      settledCount: updates.length 
    });

  } catch (err) {
    console.error('Settlement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
