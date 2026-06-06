const TEAM_SLUGS = {
  'anaheim-ducks':'anaheim-ducks','boston-bruins':'boston-bruins','buffalo-sabres':'buffalo-sabres','calgary-flames':'calgary-flames','carolina-hurricanes':'carolina-hurricanes','chicago-blackhawks':'chicago-blackhawks','colorado-avalanche':'colorado-avalanche','columbus-blue-jackets':'columbus-blue-jackets','dallas-stars':'dallas-stars','detroit-red-wings':'detroit-red-wings','edmonton-oilers':'edmonton-oilers','florida-panthers':'florida-panthers','los-angeles-kings':'los-angeles-kings','minnesota-wild':'minnesota-wild','montreal-canadiens':'montreal-canadiens','nashville-predators':'nashville-predators','new-jersey-devils':'new-jersey-devils','new-york-islanders':'new-york-islanders','new-york-rangers':'new-york-rangers','ottawa-senators':'ottawa-senators','philadelphia-flyers':'philadelphia-flyers','pittsburgh-penguins':'pittsburgh-penguins','san-jose-sharks':'san-jose-sharks','seattle-kraken':'seattle-kraken','st-louis-blues':'st-louis-blues','tampa-bay-lightning':'tampa-bay-lightning','toronto-maple-leafs':'toronto-maple-leafs','utah-mammoth':'utah-mammoth','utah-hockey-club':'utah-mammoth','vancouver-canucks':'vancouver-canucks','vegas-golden-knights':'vegas-golden-knights','washington-capitals':'washington-capitals','winnipeg-jets':'winnipeg-jets'
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
  res.end(JSON.stringify(body));
}
function htmlDecode(s) {
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
function nameFrom(v){
  if(!v || typeof v !== 'object') return '';
  const direct = v.name || v.fullName || v.displayName || v.playerName || v.longName || v.title;
  if(typeof direct === 'string') return direct;
  if(direct && typeof direct === 'object') return direct.default || direct.en || direct.name || '';
  const first = v.firstName || (v.player && v.player.firstName) || '';
  const last = v.lastName || (v.player && v.player.lastName) || '';
  const f = typeof first === 'object' ? (first.default || first.en || '') : first;
  const l = typeof last === 'object' ? (last.default || last.en || '') : last;
  return [f,l].filter(Boolean).join(' ');
}
function cleanPositionCode(raw) {
  let p = typeof raw === 'object' ? (raw.code || raw.abbrev || raw.name || raw.default || '') : String(raw || '');
  p = p.toUpperCase().replace(/[^A-Z]/g,'');
  if(p==='LEFTWING'||p==='LWING'||p==='LEFTWINGER') p='LW';
  if(p==='RIGHTWING'||p==='RWING'||p==='RIGHTWINGER') p='RW';
  if(p==='CENTER'||p==='CENTRE'||p==='CENTERMAN') p='C';
  if(p==='DEFENSE'||p==='DEFENCE'||p==='DEFENCEMAN'||p==='DEFENSEMAN') p='D';
  if(p==='GOALIE'||p==='GOALTENDER') p='G';
  return p || '';
}
function slotFrom(v, path){
  const direct = v.lineupPosition || v.linePosition || v.positionSlot || v.slot || v.lineupPos || v.forwardPosition || '';
  let p = cleanPositionCode(direct);
  const k = path.join('/').toLowerCase();
  if(!p){
    if(/left[-_\s]?wing|leftwing|lw/.test(k)) p='LW';
    else if(/right[-_\s]?wing|rightwing|rw/.test(k)) p='RW';
    else if(/center|centre|c/.test(k) && !/cap|contract/.test(k)) p='C';
    else if(/goal/.test(k)) p='G';
    else if(/defen|defen[cs]e|pair|blue/.test(k)) p='D';
  }
  return p || '';
}
function posFrom(v, path){
  const slot = slotFrom(v, path);
  if(slot) return slot;
  const raw = v.position || v.pos || v.positionCode || v.primaryPosition || v.rosterPosition || '';
  let p = cleanPositionCode(raw);
  if(!p){
    const k = path.join('/').toLowerCase();
    if(/goal/.test(k)) p='G'; else if(/defen|pair|blue/.test(k)) p='D'; else if(/forward|line|leftwing|rightwing|center|centre/.test(k)) p='F';
  }
  return p || '—';
}
function imgFrom(v){
  return v.headshot || v.headShot || v.image || v.photo || v.playerImage || v.imageUrl || v.avatar || (v.player && imgFrom(v.player)) || '';
}
function looksPlayer(v){
  if(!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const nm = nameFrom(v);
  if(!nm || nm.length < 4 || /daily faceoff|line combinations|projected/i.test(nm)) return false;
  return !!(v.playerId || v.id || v.slug || v.position || v.pos || v.fullName || v.firstName || v.lastName || v.headshot || v.playerImage || v.player);
}
function bucketFor(path, pos){
  const k = path.join('/').toLowerCase();
  if(/injur|ir/.test(k)) return 'injuries';
  if(/scratch|extra/.test(k)) return 'scratches';
  if(/goal/.test(k) || pos === 'G') return 'goalies';
  if(/defen|pair/.test(k) || pos === 'D') return 'defense';
  if(/forward|line|leftwing|rightwing|center|centre/.test(k) || ['C','LW','RW','F'].includes(pos)) return 'forwards';
  return 'other';
}
function pushUnique(arr, p){
  const key = norm(p.name);
  if(!key || arr.some(x => norm(x.name) === key)) return;
  arr.push(p);
}
function collectFromObject(root){
  const out = {forwards:[], defense:[], goalies:[], scratches:[], injuries:[], other:[]};
  const seen = new Set();
  function walk(v, path){
    if(!v || typeof v !== 'object') return;
    if(seen.has(v)) return;
    seen.add(v);
    if(Array.isArray(v)){ v.forEach((x,i)=>walk(x, path.concat(String(i)))); return; }
    if(looksPlayer(v)){
      const name = nameFrom(v);
      const pos = posFrom(v,path);
      const b = bucketFor(path,pos);
      pushUnique(out[b] || out.other, {name, pos, lineupPos:slotFrom(v,path)||'', id:v.id||v.playerId||'', slug:v.slug||v.playerSlug||'', headshot:imgFrom(v), sourceBucket:b});
    }
    Object.keys(v).forEach(k => {
      if(k === 'team' || k === 'league' || k === 'seo') return;
      walk(v[k], path.concat(k));
    });
  }
  walk(root, []);
  return out;
}
function mergeBuckets(a,b){
  ['forwards','defense','goalies','scratches','injuries','other'].forEach(k => (b[k]||[]).forEach(p => pushUnique(a[k], p)));
  return a;
}
function parseJsonScripts(html){
  const buckets = {forwards:[], defense:[], goalies:[], scratches:[], injuries:[], other:[]};
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(next){
    try { mergeBuckets(buckets, collectFromObject(JSON.parse(htmlDecode(next[1])))); } catch(e) {}
  }
  const jsonScripts = [...html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const m of jsonScripts.slice(0,20)){
    try { mergeBuckets(buckets, collectFromObject(JSON.parse(htmlDecode(m[1])))); } catch(e) {}
  }
  return buckets;
}
function parseMetaFallback(html){
  const buckets = {forwards:[], defense:[], goalies:[], scratches:[], injuries:[], other:[]};
  const text = htmlDecode(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  // Conservative fallback: only keep title-case two-word names near obvious lineup terms.
  const parts = text.split(/(?:Line Combinations|Projected Lineup|Forwards|Defense|Goalies|Scratches|Injuries)/i);
  // This fallback is deliberately weak; it avoids making up a lineup if structured page data is unavailable.
  return buckets;
}

module.exports = async function handler(req, res) {
  try {
    const team = String((req.query && req.query.team) || '').toLowerCase();
    const slug = TEAM_SLUGS[team] || team;
    if(!slug || !/^[a-z0-9-]+$/.test(slug)) return send(res, 400, {ok:false,error:'Missing or invalid team slug.'});
    const url = `https://www.dailyfaceoff.com/teams/${slug}/line-combinations`;
    const r = await fetch(url, {headers:{'user-agent':'Mozilla/5.0 Fantrax private pool lineup checker','accept':'text/html,application/xhtml+xml'}});
    const html = await r.text();
    if(!r.ok) return send(res, r.status, {ok:false,error:`Daily Faceoff returned HTTP ${r.status}`, sourceUrl:url, preview:html.slice(0,500)});
    let data = parseJsonScripts(html);
    if(!data.forwards.length && !data.defense.length && !data.goalies.length) data = parseMetaFallback(html);
    const activeCount = data.forwards.length + data.defense.length + data.goalies.length;
    send(res, 200, {ok:true, source:'dailyfaceoff-public-page', sourceUrl:url, fetchedAt:new Date().toISOString(), activeCount, lineup:data, note: activeCount ? 'Parsed projected lineup from public Daily Faceoff page data.' : 'Daily Faceoff page loaded, but no structured lineup players were found. The front end will fall back to NHL roster grouping.'});
  } catch (err) {
    send(res, 500, {ok:false,error:err && err.message ? err.message : String(err)});
  }
};
