import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  try {
    const params = new URLSearchParams(req.query).toString();
    const endpoint = `/leagues${params ? `?${params}` : ""}`;
    
    // 24-hour cache for leagues data
    const result = await fetchFootball(endpoint, 86400);
    if (result.error) return res.status(500).json(result);
    res.status(200).json(result);
  } catch (err) {
    console.error("Leagues route error:", err);
    res.status(500).json({ error: true, message: "Failed to load leagues" });
  }
}
