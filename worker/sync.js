const admin = require('firebase-admin');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

/**
 * INITIALIZATION
 */
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file
    serviceAccount = require('../tipico.json');
  }
} catch (e) {
  console.error("Critical: Could not load Firebase Service Account", e);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = "v3.football.api-sports.io";

/**
 * QUEUE SYSTEM
 */
const queue = [];
let isProcessing = false;
const DELAY_MS = 1250; // ~48 requests per minute to be safe

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    try {
      await job();
    } catch (err) {
      console.error("Queue job failed:", err);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  isProcessing = false;
}

function addToQueue(fn) {
  queue.push(fn);
  processQueue();
}

/**
 * REQUEST GUARD & STATS
 */
async function getDailyCount() {
  const today = new Date().toISOString().split('T')[0];
  const docRef = db.collection('sync_stats').doc(today);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    await docRef.set({ count: 0, date: today });
    return 0;
  }
  return doc.data().count || 0;
}

async function incrementDailyCount() {
  const today = new Date().toISOString().split('T')[0];
  const docRef = db.collection('sync_stats').doc(today);
  await docRef.update({
    count: admin.firestore.FieldValue.increment(1)
  });
}

async function canMakeRequest() {
  const count = await getDailyCount();
  if (count >= 74000) {
    console.warn(`[GUARD] API Limit nearly reached (${count}). Stopping sync.`);
    return false;
  }
  return true;
}

/**
 * FETCH WITH RETRY
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    // API-Football specific error handling
    if (data.errors && Object.keys(data.errors).length > 0) {
      throw new Error(JSON.stringify(data.errors));
    }
    
    return data;
  } catch (err) {
    if (retries === 0) throw err;
    console.log(`[RETRY] Fetch failed, retrying... (${retries} left). Error: ${err.message}`);
    await new Promise(r => setTimeout(r, 2000));
    return fetchWithRetry(url, options, retries - 1);
  }
}

/**
 * FIRESTORE HELPERS
 */
async function saveIfChanged(collection, docId, newData) {
  const docRef = db.collection(collection).doc(String(docId));
  const doc = await docRef.get();
  
  if (doc.exists) {
    const oldData = doc.data();
    // Simplified comparison: remove volatile fields like timestamps if necessary
    // For now, full stringify comparison
    if (JSON.stringify(oldData) === JSON.stringify(newData)) {
      return false; // No change
    }
  }
  
  await docRef.set({ ...newData, lastSync: admin.firestore.FieldValue.serverTimestamp() });
  return true; // Updated
}

/**
 * SYNC TASKS
 */

// 1. Sync Live Matches
async function syncLive() {
  if (!(await canMakeRequest())) return;

  addToQueue(async () => {
    console.log("[SYNC] Fetching Live Matches...");
    try {
      const data = await fetchWithRetry(`https://${API_HOST}/fixtures?live=all`, {
        headers: { "x-apisports-key": API_KEY }
      });
      await incrementDailyCount();

      const fixtures = data.response || [];
      for (const f of fixtures) {
        await saveIfChanged('live_matches', f.fixture.id, f);
      }
      
      // Cleanup: Remove live matches that are no longer in the live list
      const liveIds = fixtures.map(f => String(f.fixture.id));
      const currentLive = await db.collection('live_matches').get();
      for (const doc of currentLive.docs) {
        if (!liveIds.includes(doc.id)) {
          await doc.ref.delete();
        }
      }
      
      console.log(`[SYNC] Live Sync Complete. (${fixtures.length} matches)`);
    } catch (err) {
      console.error("[SYNC] Live Sync Error:", err.message);
    }
  });
}

// 2. Sync Upcoming Fixtures (for a set of leagues)
const TOP_LEAGUES = [2, 39, 140, 135, 78, 61, 3, 848, 94, 88];

async function syncUpcoming() {
  if (!(await canMakeRequest())) return;

  for (const leagueId of TOP_LEAGUES) {
    addToQueue(async () => {
      console.log(`[SYNC] Fetching Upcoming for League ${leagueId}...`);
      try {
        const data = await fetchWithRetry(`https://${API_HOST}/fixtures?league=${leagueId}&next=20`, {
          headers: { "x-apisports-key": API_KEY }
        });
        await incrementDailyCount();

        const fixtures = data.response || [];
        for (const f of fixtures) {
          await saveIfChanged('fixtures', f.fixture.id, f);
        }
      } catch (err) {
        console.error(`[SYNC] Upcoming League ${leagueId} Error:`, err.message);
      }
    });
  }
}

// 3. Sync Odds for Live & Upcoming
async function syncOdds() {
  if (!(await canMakeRequest())) return;

  // Sync odds for live matches
  const liveMatches = await db.collection('live_matches').get();
  for (const doc of liveMatches.docs) {
    const fixtureId = doc.id;
    addToQueue(async () => {
      try {
        const data = await fetchWithRetry(`https://${API_HOST}/odds?fixture=${fixtureId}`, {
          headers: { "x-apisports-key": API_KEY }
        });
        await incrementDailyCount();
        
        if (data.response?.[0]) {
          await saveIfChanged('odds', fixtureId, data.response[0]);
        }
      } catch (err) {
        console.error(`[SYNC] Odds for Live ${fixtureId} Error:`, err.message);
      }
    });
  }
}

// 4. Sync Match Details (Stats & Lineups) for Live matches
async function syncMatchDetails() {
  if (!(await canMakeRequest())) return;

  const liveMatches = await db.collection('live_matches').get();
  for (const doc of liveMatches.docs) {
    const fixtureId = doc.id;
    
    // Stats
    addToQueue(async () => {
      try {
        const data = await fetchWithRetry(`https://${API_HOST}/fixtures/statistics?fixture=${fixtureId}`, {
          headers: { "x-apisports-key": API_KEY }
        });
        await incrementDailyCount();
        if (data.response) await saveIfChanged('match_stats', fixtureId, { response: data.response });
      } catch (err) {
        console.error(`[SYNC] Stats for ${fixtureId} Error:`, err.message);
      }
    });

    // Lineups
    addToQueue(async () => {
      try {
        const data = await fetchWithRetry(`https://${API_HOST}/fixtures/lineups?fixture=${fixtureId}`, {
          headers: { "x-apisports-key": API_KEY }
        });
        await incrementDailyCount();
        if (data.response) await saveIfChanged('match_lineups', fixtureId, { response: data.response });
      } catch (err) {
        console.error(`[SYNC] Lineups for ${fixtureId} Error:`, err.message);
      }
    });
  }
}

// 5. Sync Recently Finished Matches (for settlement)
async function syncFinished() {
  if (!(await canMakeRequest())) return;

  for (const leagueId of TOP_LEAGUES) {
    addToQueue(async () => {
      console.log(`[SYNC] Fetching Finished for League ${leagueId}...`);
      try {
        const data = await fetchWithRetry(`https://${API_HOST}/fixtures?league=${leagueId}&last=20`, {
          headers: { "x-apisports-key": API_KEY }
        });
        await incrementDailyCount();

        const fixtures = data.response || [];
        for (const f of fixtures) {
          await saveIfChanged('finished_matches', f.fixture.id, f);
        }
      } catch (err) {
        console.error(`[SYNC] Finished League ${leagueId} Error:`, err.message);
      }
    });
  }
}

// 6. Automated Ticket Settlement
async function syncSettle() {
  console.log("[SETTLE] Starting automated settlement...");
  try {
    const pendingTickets = await db.collection('tickets').where('status', '==', 'pending').get();
    if (pendingTickets.empty) return;

    for (const ticketDoc of pendingTickets.docs) {
      const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
      let isLost = false;
      let isPending = false;
      
      const updatedBets = [];
      for (const bet of ticket.bets) {
        // Check both collections for the match result
        let matchDoc = await db.collection('finished_matches').doc(String(bet.matchId)).get();
        if (!matchDoc.exists) {
          matchDoc = await db.collection('live_matches').doc(String(bet.matchId)).get();
        }

        if (matchDoc.exists) {
          const m = matchDoc.data();
          const status = m.fixture?.status?.short;
          if (['FT', 'AET', 'PEN'].includes(status)) {
            const homeGoals = m.goals.home;
            const awayGoals = m.goals.away;
            let outcome = 'draw';
            if (homeGoals > awayGoals) outcome = 'home';
            else if (awayGoals > homeGoals) outcome = 'away';

            const result = bet.selection === outcome ? 'won' : 'lost';
            updatedBets.push({ ...bet, result });
            if (result === 'lost') isLost = true;
          } else {
            updatedBets.push({ ...bet, result: 'pending' });
            isPending = true;
          }
        } else {
          updatedBets.push({ ...bet, result: 'pending' });
          isPending = true;
        }
      }

      const ticketRef = db.collection('tickets').doc(ticket.id);
      if (isLost) {
        await ticketRef.update({ status: 'lost', bets: updatedBets });
        console.log(`[SETTLE] Ticket ${ticket.id} LOST`);
      } else if (!isPending) {
        // All won!
        await db.runTransaction(async (transaction) => {
          const userRef = db.collection('users').doc(ticket.userId);
          transaction.update(ticketRef, { status: 'won', bets: updatedBets });
          transaction.update(userRef, {
            balance: admin.firestore.FieldValue.increment(ticket.potentialWin)
          });
        });
        console.log(`[SETTLE] Ticket ${ticket.id} WON! Credited: ${ticket.potentialWin}`);
      } else {
        // Still pending but maybe some bets finished
        await ticketRef.update({ bets: updatedBets });
      }
    }
  } catch (err) {
    console.error("[SETTLE] Error:", err.message);
  }
}

/**
 * SCHEDULER
 */
console.log("--- Football Sync Worker Started ---");

// Initial run
syncLive();
syncUpcoming();
syncOdds();
syncMatchDetails();
syncFinished();
// Settlement runs after finished matches are synced
setTimeout(syncSettle, 60000); 

// Intervals
setInterval(syncLive, 30000);         // Every 30s
setInterval(syncUpcoming, 600000);     // Every 10m
setInterval(syncOdds, 900000);         // Every 15m
setInterval(syncMatchDetails, 120000); // Every 2m
setInterval(syncFinished, 3600000);    // Every 1h
setInterval(syncSettle, 3600000);      // Every 1h (after syncFinished)

// Daily reset check (runs every hour)
setInterval(async () => {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[HEARTBEAT] Worker running. Date: ${today}. Queue: ${queue.length}`);
}, 3600000);
