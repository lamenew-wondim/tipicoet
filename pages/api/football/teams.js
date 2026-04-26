import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const leagueId = req.query.league;
  const season = req.query.season || 2023;
  if (!leagueId) return res.status(400).json({ error: "league is required" });

  try {
    const result = await fetchFootball(`/teams?league=${leagueId}&season=${season}`);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load teams" });
  }
}
