import { fetchFootball } from "../../../../lib/apiFootball";

export default async function handler(req, res) {
  const { fixture_id, league } = req.query;
  
  let endpoint = '';
  if (fixture_id) {
    endpoint = `/odds/live?fixture=${fixture_id}`;
  } else if (league) {
    endpoint = `/odds/live?league=${league}`;
  } else {
    // If nothing specified, maybe return error or handle differently
    return res.status(400).json({ error: true, message: "fixture_id or league is required" });
  }
  
  try {
    // 15-second cache for live odds
    const result = await fetchFootball(endpoint, 15);
    
    if (result.error) {
      return res.status(500).json(result);
    }
    
    res.status(200).json(result);
  } catch (err) {
    console.error("Live odds route error:", err);
    res.status(500).json({ error: true, message: "Failed to load live odds" });
  }
}
