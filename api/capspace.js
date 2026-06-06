const https = require('https');

const CAPSPACE_BASE = 'https://cap-space.com';

// Guardrails for bad/public-source data. NHL max individual cap hit is 20% of the upper limit;
// this ceiling is deliberately generous so legit future contracts are not filtered out.
const MAX_REASONABLE_PLAYER_CAP_HIT = 25000000;
const MAX_REASONABLE_TEAM_CAP_HIT = 150000000;

const TEAM_TO_CODE = {
  'anaheim-ducks':'ana','ana':'ana',
  'boston-bruins':'bos','bos':'bos',
  'buffalo-sabres':'buf','buf':'buf',
  'calgary-flames':'cgy','cgy':'cgy',
  'carolina-hurricanes':'car','car':'car',
  'chicago-blackhawks':'chi','chi':'chi',
  'colorado-avalanche':'col','col':'col',
  'columbus-blue-jackets':'cbj','cbj':'cbj',
  'dallas-stars':'dal','dal':'dal',
  'detroit-red-wings':'det','det':'det',
  'edmonton-oilers':'edm','edm':'edm',
  'florida-panthers':'fla','fla':'fla',
  'los-angeles-kings':'lak','la-kings':'lak','lak':'lak',
  'minnesota-wild':'min','min':'min',
  'montreal-canadiens':'mtl','montréal-canadiens':'mtl','mtl':'mtl',
  'nashville-predators':'nsh','nsh':'nsh',
  'new-jersey-devils':'njd','njd':'njd',
  'new-york-islanders':'nyi','nyi':'nyi',
  'new-york-rangers':'nyr','nyr':'nyr',
  'ottawa-senators':'ott','ott':'ott',
  'philadelphia-flyers':'phi','phi':'phi',
  'pittsburgh-penguins':'pit','pit':'pit',
  'san-jose-sharks':'sjs','sj-sharks':'sjs','sjs':'sjs',
  'seattle-kraken':'sea','sea':'sea',
  'st-louis-blues':'stl','stl':'stl',
  'tampa-bay-lightning':'tbl','tbl':'tbl',
  'toronto-maple-leafs':'tor','tor':'tor',
  'utah-mammoth':'uta','utah-hockey-club':'uta','uta':'uta',
  'vancouver-canucks':'van','van':'van',
  'vegas-golden-knights':'vgk','vgk':'vgk',
  'washington-capitals':'was','washington-capitals-wsh':'was','wsh':'was','was':'was',
  'winnipeg-jets':'wpg','wpg':'wpg'
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FantraxPoolPrivateSite/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: data }));
    });
    req.on('timeout', () => req.destroy(new Error('Timed out contacting CapSpace')));
    req.on('error', reject);
  });
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

function cleanText(html) {
  return decodeEntities(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}


function moneyTokens(v) {
  if (v === undefined || v === null) return [];
  const text = String(v).replace(/&nbsp;/gi, ' ');
  const matches = text.match(/-?\$\s*\d[\d,]*(?:\.\d+)?/g) || [];
  return matches.map(x => {
    const n = Number(String(x).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }).filter(n => n !== null);
}

function moneyNumber(v) {
  const tokens = moneyTokens(v);
  if (tokens.length) return tokens[0];
  const n = Number(String(v || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function reasonableMoneyTokens(v, maxValue) {
  return moneyTokens(v).filter(n => n >= 0 && n <= maxValue);
}

function parseSummary(text) {
  const out = {};
  const ignored = [];
  const patterns = {
    currentCapHit: /Current Cap Hit:\s*(\$[0-9,\.]+)/i,
    projectedCapHit: /Projected Cap Hit:\s*(\$[0-9,\.]+)/i,
    projectedCapSpace: /Projected Cap Space:\s*(\$[0-9,\.]+)/i,
    contracts: /Contracts:\s*(\d+)/i,
    roster: /Roster:\s*(\d+)/i,
    injuries: /Injuries:\s*(\d+)/i,
    retainedContracts: /Retained Contracts:\s*(\d+)/i
  };
  Object.keys(patterns).forEach(k => {
    const m = text.match(patterns[k]);
    if (!m) return;
    if (k.includes('Cap')) {
      const value = moneyNumber(m[1]);
      if (value !== null && Math.abs(value) <= MAX_REASONABLE_TEAM_CAP_HIT) out[k] = value;
      else ignored.push({ field:k, value:m[1], reason:'unrealistic team cap total' });
    } else {
      out[k] = Number(m[1]);
    }
  });
  if (ignored.length) out.ignoredValues = ignored;
  return out;
}

function getRows(html) {
  const rows = [];
  const trRe = /<tr\b[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html))) {
    const rowHtml = m[0];
    const cells = [];
    const cellRe = /<t[dh]\b[\s\S]*?<\/t[dh]>/gi;
    let c;
    while ((c = cellRe.exec(rowHtml))) {
      const txt = cleanText(c[0]);
      if (txt) cells.push(txt);
      else cells.push('');
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function classifyPosition(value) {
  const s = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const allowed = new Set(['C','LW','RW','F','D','G','C,RW','C,LW','LW,RW','RW,LW','C/RW','C/LW','LW/RW','RW/LW']);
  return allowed.has(s) ? s.replace('/', ',') : '';
}

function parsePlayerRows(html) {
  const rows = getRows(html);
  const players = [];
  const ignoredRows = [];
  let currentSection = '';
  let currentSeason = '';
  for (const cells of rows) {
    const joined = cells.join(' ').replace(/\s+/g, ' ').trim();
    // Preserve the section so the front-end can do cap accounting instead of treating every non-lineup player as excluded.
    // CapSpace sections are the closest free source we have for buckets like NHL Roster, LTIR, Non-Roster/buried, etc.
    if (/\bDraft Picks\b/i.test(joined)) currentSection = 'Draft Picks';
    if (/\bReserve Rights\b/i.test(joined)) currentSection = 'Reserve Rights';
    if (/\bFree Agents\b/i.test(joined)) currentSection = 'Free Agents';
    if (/\bNon-Roster\b/i.test(joined)) currentSection = 'Non-Roster';
    if (/\bOffense\b/i.test(joined)) currentSection = 'Offense';
    if (/\bDefense\b/i.test(joined)) currentSection = 'Defense';
    if (/\bGoaltending\b/i.test(joined)) currentSection = 'Goaltending';
    if (/\bLTIR\b/i.test(joined)) currentSection = 'LTIR';
    if (/\bInjured Reserve\b/i.test(joined)) currentSection = 'Injured Reserve';
    if (/\bRetained\b/i.test(joined)) currentSection = 'Retained';
    if (/\bBuyouts?\b/i.test(joined)) currentSection = 'Buyout';
    if (/\bBonus Overages?\b/i.test(joined)) currentSection = 'Bonus Overage';
    if (!currentSeason) {
      const seasonMatch = joined.match(/20\d{2}-20\d{2}/);
      if (seasonMatch) currentSeason = seasonMatch[0];
    }
    if (!currentSection || /^(#|Offense|Defense|Goaltending|LTIR|Non-Roster|Free Agents|Reserve Rights|Draft Picks|Injured Reserve|Retained|Buyout|Bonus Overage)\b/i.test(joined)) continue;
    if (/^(Draft Picks|Reserve Rights)$/i.test(currentSection)) continue;
    if (!cells.some(x => /\$[0-9]/.test(x))) continue;

    let posIndex = -1;
    for (let i = 0; i < cells.length; i++) {
      if (classifyPosition(cells[i])) { posIndex = i; break; }
    }
    if (posIndex < 1) continue;

    const moneyIndex = cells.findIndex((x, i) => i > posIndex && /\$[0-9]/.test(x));
    if (moneyIndex < 0) continue;

    const number = /^\d{1,3}$/.test(cells[0]) ? cells[0] : '';
    const nameIndex = number ? 1 : Math.max(0, posIndex - 1);
    let name = cells[nameIndex] || '';
    name = name.replace(/\b(Waivers Exempt|Injured|Suspended)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (!name || /\$|Position|Expires|Clause|Draft Picks|Buyouts|Retained/i.test(name)) continue;

    const pos = classifyPosition(cells[posIndex]);
    const age = cells[posIndex + 1] && /^\d{1,2}$/.test(cells[posIndex + 1]) ? cells[posIndex + 1] : '';
    const expiresAs = cells[posIndex + 2] && /^(UFA|RFA|10\.2\(c\)|Indefinite)$/i.test(cells[posIndex + 2]) ? cells[posIndex + 2] : '';
    const allMoney = cells.slice(moneyIndex).flatMap(x => reasonableMoneyTokens(x, MAX_REASONABLE_PLAYER_CAP_HIT));
    const capHitCandidates = reasonableMoneyTokens(cells[moneyIndex], MAX_REASONABLE_PLAYER_CAP_HIT);
    const capHit = capHitCandidates.length ? capHitCandidates[0] : moneyNumber(cells[moneyIndex]);
    if (capHit === null || capHit < 0 || capHit > MAX_REASONABLE_PLAYER_CAP_HIT) {
      ignoredRows.push({ name, pos, value: cells[moneyIndex], reason: 'unrealistic player cap hit' });
      continue;
    }
    const futureYears = allMoney.length ? allMoney : cells.slice(moneyIndex).flatMap(x => reasonableMoneyTokens(x, MAX_REASONABLE_PLAYER_CAP_HIT));
    const nhlBaseCapHit = allMoney.length > 1 ? allMoney[1] : capHit;
    const capClass = /LTIR/i.test(currentSection) ? 'ltir'
      : /Injured/i.test(currentSection) ? 'ir'
      : /Non-Roster|Minor|Buried/i.test(currentSection) ? 'non-roster'
      : /Retained/i.test(currentSection) ? 'retained'
      : /Buyout/i.test(currentSection) ? 'buyout'
      : /Bonus/i.test(currentSection) ? 'overage'
      : /Free Agents/i.test(currentSection) ? 'free-agent'
      : 'nhl-roster';

    players.push({
      number,
      name,
      playerName: name,
      pos,
      position: pos,
      section: currentSection,
      capClass,
      age,
      expiresAs,
      status: currentSection,
      capHit,
      salary: nhlBaseCapHit,
      aav: nhlBaseCapHit,
      nhlBaseCapHit,
      currentSeason: currentSeason || 'current',
      years: futureYears,
      source: 'CapSpace public team page'
    });
  }
  const seen = new Set();
  const filtered = players.filter(p => {
    const key = `${p.name}|${p.pos}|${p.capHit}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  filtered.ignoredRows = ignoredRows;
  return filtered;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  const teamParam = String((req.query && req.query.team) || 'toronto-maple-leafs').toLowerCase();
  const code = TEAM_TO_CODE[teamParam] || TEAM_TO_CODE[teamParam.replace(/_/g, '-')] || teamParam;
  if (!/^[a-z]{2,3}$/.test(code)) {
    res.status(400).json({ ok:false, error:`Unknown CapSpace team code for ${teamParam}` });
    return;
  }
  const url = `${CAPSPACE_BASE}/team/${code}`;
  try {
    const response = await fetchText(url);
    if (response.status < 200 || response.status >= 300) {
      res.status(response.status || 502).json({ ok:false, error:`CapSpace returned HTTP ${response.status}`, source:url });
      return;
    }
    const plain = cleanText(response.body);
    const meta = parseSummary(plain);
    const players = parsePlayerRows(response.body);
    const ignoredRows = Array.isArray(players.ignoredRows) ? players.ignoredRows : [];
    res.status(200).json({
      ok: true,
      provider: 'CapSpace',
      source: url,
      team: code.toUpperCase(),
      meta,
      data: { players },
      rowsFound: players.length,
      ignoredRows,
      guardrails: {
        maxPlayerCapHit: MAX_REASONABLE_PLAYER_CAP_HIT,
        maxTeamCapHit: MAX_REASONABLE_TEAM_CAP_HIT,
        parser: 'splits multiple dollar values in the same HTML cell instead of joining them'
      },
      note: ignoredRows.length
        ? `Parsed from CapSpace public team page. Ignored ${ignoredRows.length} row(s) with impossible salary/cap values. Multi-year money cells are split before parsing. No paid API key used.`
        : 'Parsed from CapSpace public team page. Multi-year money cells are split before parsing. No paid API key used.'
    });
  } catch (err) {
    res.status(500).json({ ok:false, error: err && err.message ? err.message : String(err), source:url });
  }
};
