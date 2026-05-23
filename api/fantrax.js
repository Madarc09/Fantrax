const LEAGUES = {
  bbl: "h9ym9x3jmbv5azed",
  basement: "h9ym9x3jmbv5azed",
  forever: "ro1p4p1umbv5akmv",
  fp: "ro1p4p1umbv5akmv"
};

const ENDPOINTS = {
  standings: "getStandings",
  leagueInfo: "getLeagueInfo",
  rosters: "getTeamRosters",
  draftResults: "getDraftResults",
  draftPicks: "getDraftPicks",
  transactions: "getTransactions",
  trades: "getTransactions",
  playerIds: "getPlayerIds",
  players: "getPlayerIds",
  adp: "getAdp",
  playerInfo: "getAdp"
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const q = req.query || {};
    const leagueKey = String(q.league || "").trim();
    const endpointKey = String(q.endpoint || "standings").trim();
    const leagueId = LEAGUES[leagueKey] || leagueKey;
    const endpoint = ENDPOINTS[endpointKey] || endpointKey;

    if (!leagueId || !/^[a-z0-9]+$/i.test(leagueId)) {
      return res.status(400).json({ ok: false, error: "Missing or invalid league parameter." });
    }
    const isFxpaSchedule = endpointKey === "scheduleResults" || endpointKey === "results" || endpointKey === "matchupResults" || endpointKey === "schedule";

    if (!isFxpaSchedule && !/^get[A-Za-z]+$/.test(endpoint)) {
      return res.status(400).json({ ok: false, error: "Missing or invalid endpoint parameter." });
    }

    let url;
    let response;
    let sourceType = "fxea-general";

    if (isFxpaSchedule) {
      // This is the hidden request Fantrax uses for Standings -> Results/Schedule.
      // It returns tableList rows for each scoring period with away/home team IDs and scores.
      sourceType = "fxpa-req-getStandings-SCHEDULE";
      url = new URL("https://www.fantrax.com/fxpa/req");
      url.searchParams.set("leagueId", leagueId);
      const body = {
        msgs: [{ method: "getStandings", data: { leagueId, view: "SCHEDULE" } }],
        uiv: 3,
        refUrl: `https://www.fantrax.com/fantasy/league/${leagueId}/standings;view=SCHEDULE`,
        dt: 1,
        at: 0,
        tz: q.tz || "America/New_York",
        v: q.v || "182.3.2"
      };
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          accept: "application/json,text/plain,*/*",
          "content-type": "application/json",
          "user-agent": "FantraxVercelApiTrial/1.1"
        },
        body: JSON.stringify(body)
      });
    } else {
      url = new URL(`https://www.fantrax.com/fxea/general/${endpoint}`);
      if (endpoint === "getPlayerIds" || endpoint === "getAdp") {
        url.searchParams.set("sport", q.sport || "NHL");
        if (endpoint === "getAdp") {
          url.searchParams.set("showAllPositions", q.showAllPositions || "true");
          url.searchParams.set("order", q.order || "NAME");
          if (q.start) url.searchParams.set("start", q.start);
          if (q.limit) url.searchParams.set("limit", q.limit);
          if (!q.limit) url.searchParams.set("limit", "10000");
        }
      } else {
        url.searchParams.set("leagueId", leagueId);
        if (q.period) url.searchParams.set("period", q.period);
      }
      response = await fetch(url.toString(), {
        headers: {
          accept: "application/json,text/plain,*/*",
          "user-agent": "FantraxVercelApiTrial/1.0"
        }
      });
    }

    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch { payload = { raw: text }; }

    res.setHeader("Cache-Control", "no-store");
    return res.status(response.status).json({
      ok: response.ok,
      endpoint: isFxpaSchedule ? "getStandings:SCHEDULE" : endpoint,
      requestedEndpoint: endpointKey,
      leagueId,
      sourceType,
      source: url.toString(),
      fetchedAt: new Date().toISOString(),
      data: payload
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
}
