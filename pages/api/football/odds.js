import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const fixtureId = req.query.fixture_id;
  if (!fixtureId) return res.status(400).json({ error: "fixture_id is required" });
  
  try {
    // 1. Try general fetch
    let result = await fetchFootball(`/odds?fixture=${fixtureId}`);
    
    // 2. Fallback to Bet365 (ID 8) if general is empty
    if (!result.response || result.response.length === 0) {
      result = await fetchFootball(`/odds?fixture=${fixtureId}&bookmaker=8`);
    }
    
    // 3. Final Fallback to 1xBet (ID 1)
    if (!result.response || result.response.length === 0) {
      result = await fetchFootball(`/odds?fixture=${fixtureId}&bookmaker=1`);
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load odds" });
  }
}
