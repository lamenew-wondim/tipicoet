
const { calculatePopularity, getPopularMatches } = require('../lib/popularity');

// Mock match
const mockMatch = (id, leagueId, status, date) => ({
  fixture: { id, status: { short: status }, date },
  league: { id: leagueId },
  teams: { home: { name: 'Team A' }, away: { name: 'Team B' } }
});

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

const combined = [
  mockMatch(1, 39, '1H', now.toISOString()), // Live PL
  mockMatch(2, 140, '2H', now.toISOString()), // Live La Liga
  mockMatch(3, 78, 'NS', tomorrow), // Pre-match Bundesliga
  mockMatch(4, 39, 'NS', tomorrow), // Pre-match PL
];

console.log('--- Scoring ---');
combined.forEach(m => {
  console.log(`Match ${m.fixture.id} (${m.fixture.status.short}): ${calculatePopularity(m)}`);
});

console.log('--- Ranking ---');
const trending = getPopularMatches(combined, 10);
trending.forEach(m => {
  console.log(`Match ${m.fixture.id} (${m.fixture.status.short}) Score: ${m.popularityScore}`);
});
