import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const league = req.query.league;
  const season = req.query.season;
  if (!league || !season) return res.status(400).json({ error: "league and season are required" });
  
  try {
    const result = await fetchFootball(`/standings?league=${league}&season=${season}`, 3600); // 1h cache
    if (result.error) return res.status(500).json(result);
    res.status(200).json(result);
  } catch (err) {
    console.error("Standings route error:", err);
    res.status(500).json({ error: true, message: "Failed to load standings" });
  }
}
