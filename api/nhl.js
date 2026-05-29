const NHL_BASE = "https://api-web.nhle.com/v1/";

const ALLOWED = [
  /^score\/now$/,
  /^schedule\/now$/,
  /^standings\/now$/,
  /^season$/,
  /^roster\/[A-Z]{3}\/current$/,
  /^roster\/[A-Z]{3}\/[0-9]{8}$/,
  /^roster-season\/[A-Z]{3}$/,
  /^club-stats\/[A-Z]{3}\/[0-9]{8}\/[23]$/,
  /^club-schedule-season\/[A-Z]{3}\/now$/,
  /^club-schedule-season\/[A-Z]{3}\/[0-9]{8}$/,
  /^player\/[0-9]+\/landing$/,
  /^draft\/rankings\/now$/
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });
  try {
    const endpoint = String(req.query.endpoint || "score/now").replace(/^\/+/, "").trim();
    if (!ALLOWED.some(rx => rx.test(endpoint))) {
      return res.status(400).json({ ok:false, error:"Endpoint not allowed by proxy safety list.", endpoint });
    }
    const url = NHL_BASE + endpoint;
    const response = await fetch(url, { headers: { accept:"application/json", "user-agent":"FantraxPoolsNHLProxy/1.0" } });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw:text }; }
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(response.status).json({ ok:response.ok, endpoint, source:url, fetchedAt:new Date().toISOString(), data });
  } catch (error) {
    return res.status(500).json({ ok:false, error:error.message || String(error) });
  }
}
