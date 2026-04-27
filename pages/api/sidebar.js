import { fetchFootball } from "../../lib/apiFootball";

export default async function handler(req, res) {
  const { days = 7, live = 'false' } = req.query;
  const isLive = live === 'true';
  const filterDays = parseInt(days) || 7;

  try {
    const data = await fetchFootball('/leagues');
    const allLeagues = data.response || [];

    // Safety subset of leagues filtering
    let activeLeagueIds = new Set();

    if (isLive) {
      const liveData = await fetchFootball('/fixtures?live=all');
      (liveData.response || []).forEach(f => activeLeagueIds.add(f.fixture?.league?.id || f.league?.id));
    } else {
      // For prematch we no longer need to fetch next 99 fixtures to populate sidebar,
      // because we display all leagues unconditionally.

      // To ensure Top Leagues are displayed unconditionally in the sidebar
      // Specific 10 Top Leagues IDs in requested order
      const famousIds = [2, 39, 140, 135, 78, 61, 3, 848, 94, 88];

      famousIds.forEach(id => {
        activeLeagueIds.add(id);
      });
    }

    const famousIdsOrder = [2, 39, 140, 135, 78, 61, 3, 848, 94, 88];

    // For live, only show leagues that actually have live games.
    // For prematch, allow browsing all leagues.
    const validateList = isLive
      ? allLeagues.filter(l => activeLeagueIds.has(l.league.id))
      : allLeagues;

    const topLeagues = validateList
      .filter(l => famousIdsOrder.includes(l.league.id))
      .sort((a, b) => famousIdsOrder.indexOf(a.league.id) - famousIdsOrder.indexOf(b.league.id))
      .map(l => {
        // Format name as "Country. League" for domestic leagues, or just "League" for international
        const displayName = l.country.name !== 'World' ? `${l.country.name}. ${l.league.name}` : l.league.name;
        return {
          id: l.league.id,
          name: displayName,
          logo: l.league.logo
        };
      });

    // All other active leagues go to "Others", sorted alphabetically by country
    const otherCountries = validateList
      .filter(l => !famousIdsOrder.includes(l.league.id) && l.country.flag)
      .sort((a, b) => a.country.name.localeCompare(b.country.name))
      .slice(0, isLive ? Math.max(filterDays * 3, 5) : 50)
      .map(l => ({ id: l.league.id, name: `${l.country.name}. ${l.league.name}`, logo: l.country.flag || l.league.logo }));

    res.status(200).json([
      { type: "top_leagues", title: "Top Leagues", leagues: topLeagues },
      { type: "sports", title: "Others", subcategory: "Football", count: activeLeagueIds.size, leagues: otherCountries }
    ]);
  } catch (err) {
    res.status(500).json([]);
  }
}
