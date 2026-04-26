import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const h2h = req.query.h2h;
  if (!h2h) return res.status(400).json({ error: "h2h is required" });
  
  try {
    const result = await fetchFootball(`/fixtures/headtohead?h2h=${h2h}&last=10`, 3600 * 24); // 24h cache
    if (result.error) return res.status(500).json(result);
    res.status(200).json(result);
  } catch (err) {
    console.error("H2H route error:", err);
    res.status(500).json({ error: true, message: "Failed to load h2h" });
  }
}
