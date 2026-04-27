import { fetchFootball } from "../../../../lib/apiFootball";
import { extractBestOdds } from "../../../../lib/odds";

export default async function handler(req, res) {
  const { league, season, ids } = req.query;

  try {
    const oddsMap = {};

    if (ids) {
      // Fetch odds for specific fixture IDs
      const idList = ids.split(',');
      
      // Fetch in parallel
      const promises = idList.map(async id => {
        let data = await fetchFootball(`/odds?fixture=${id}&bet=1`, 300);
        if ((!data.response || data.response.length === 0) || data.error) {
          const fb8 = await fetchFootball(`/odds?fixture=${id}&bet=1&bookmaker=8`, 300);
          if (fb8.response?.length > 0) data = fb8;
        }
        return data;
      });
      const results = await Promise.all(promises);

      for (const data of results) {
        if (data.response && data.response.length > 0) {
          const entry = data.response[0];
          const fixtureId = entry.fixture?.id;
          if (fixtureId) {
            oddsMap[fixtureId] = extractBestOdds(entry);
          }
        }
      }
    } else if (league && season) {
      // Existing league/season logic
      let data = await fetchFootball(`/odds?league=${league}&season=${season}&bet=1`, 300);

      if ((!data.response || data.response.length === 0) || data.error) {
        const fb8 = await fetchFootball(`/odds?league=${league}&season=${season}&bet=1&bookmaker=8`, 300);
        if (fb8.response?.length > 0) data = fb8;
      }
      
      if (data.error) return res.status(500).json(data);

      for (const entry of data.response || []) {
        const fixtureId = entry.fixture?.id;
        if (!fixtureId) continue;
        const bestOdds = extractBestOdds(entry);
        if (bestOdds && (bestOdds.home || bestOdds.draw || bestOdds.away)) {
          oddsMap[fixtureId] = bestOdds;
        }
      }
    } else {
      return res.status(400).json({ error: true, message: "league/season or ids are required" });
    }

    res.status(200).json({ odds: oddsMap });
  } catch (err) {
    console.error("Bulk odds route error:", err);
    res.status(500).json({ error: true, message: "Failed to load bulk odds" });
  }
}
