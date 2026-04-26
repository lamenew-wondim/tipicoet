import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const fixtureId = req.query.id;
  if (!fixtureId) return res.status(400).json({ error: "id is required" });
  
  try {
    const result = await fetchFootball(`/fixtures/statistics?fixture=${fixtureId}`, 300); // 5m cache
    if (result.error) return res.status(500).json(result);
    res.status(200).json(result);
  } catch (err) {
    console.error("Stats route error:", err);
    res.status(500).json({ error: true, message: "Failed to load stats" });
  }
}
