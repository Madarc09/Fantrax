const CAPWAGES_BASE = "https://capwages.com/api/gateway/v1";

const TEAM_SLUGS = new Set([
  "anaheim-ducks","boston-bruins","buffalo-sabres","calgary-flames","carolina-hurricanes",
  "chicago-blackhawks","colorado-avalanche","columbus-blue-jackets","dallas-stars","detroit-red-wings",
  "edmonton-oilers","florida-panthers","los-angeles-kings","minnesota-wild","montreal-canadiens",
  "nashville-predators","new-jersey-devils","new-york-islanders","new-york-rangers","ottawa-senators",
  "philadelphia-flyers","pittsburgh-penguins","san-jose-sharks","seattle-kraken","st-louis-blues",
  "tampa-bay-lightning","toronto-maple-leafs","utah-mammoth","utah-hockey-club","vancouver-canucks",
  "vegas-golden-knights","washington-capitals","winnipeg-jets"
]);

function cleanSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });

  try {
    const team = cleanSlug(req.query.team || req.query.teamSlug || "toronto-maple-leafs");
    if (!TEAM_SLUGS.has(team)) {
      return res.status(400).json({ ok:false, error:"Team slug is not in the approved NHL team list.", team });
    }

    const url = `${CAPWAGES_BASE}/lineups/${team}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "FantraxPoolsCapWagesProbe/1.0"
      }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { raw: text.slice(0, 8000) }; }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    return res.status(response.status).json({
      ok: response.ok,
      team,
      endpoint: `/lineups/${team}`,
      source: url,
      fetchedAt: new Date().toISOString(),
      data
    });
  } catch (error) {
    return res.status(500).json({ ok:false, error:error.message || String(error) });
  }
}
