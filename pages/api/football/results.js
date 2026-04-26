import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  try {
    const result = await fetchFootball("/fixtures?status=FT&last=10"); // Finished matches
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load results" });
  }
}
