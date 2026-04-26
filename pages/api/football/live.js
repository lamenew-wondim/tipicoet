import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const { league } = req.query;
  const year = new Date().getFullYear();
  const endpoint = league 
    ? `/fixtures?league=${league}&live=all` 
    : `/fixtures?live=all`;

  try {
    const data = await fetchFootball(endpoint, 15); // 15s cache for live matches
    if (data.error) {
      return res.status(500).json(data);
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Live route error:", error);
    res.status(500).json({ error: true, message: 'Failed to fetch live matches' });
  }
}
