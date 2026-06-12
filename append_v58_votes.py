from pathlib import Path

base = Path('/mnt/data/fantrax_v57_edit')
files = [base/'Basement Bar League/index.html', base/'Forever Pool/index.html']

v58 = r'''

<!-- === V58 pool updates dogtag voting override === -->
<style>
  .v58-vote-top{display:grid;grid-template-columns:minmax(220px,360px) 1fr;gap:14px;align-items:end;margin:14px 0 18px;padding:12px;border:1px solid rgba(213,157,70,.22);border-radius:16px;background:rgba(0,0,0,.36)}
  .v58-team-picker label,.v58-admin-label{display:block;font-family:monospace;color:rgba(255,255,255,.62);font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
  .v58-selected-preview{min-height:74px;display:flex;align-items:center;gap:12px;border:1px dashed rgba(213,157,70,.24);border-radius:14px;padding:8px 10px;color:rgba(255,255,255,.62);font-family:monospace;text-transform:uppercase;font-size:11px;letter-spacing:.06em;background:rgba(255,255,255,.03)}
  .v58-preview-tag{width:148px;max-width:42vw;height:58px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))}
  .v58-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:12px}
  .v58-option-card{border:1px solid rgba(213,157,70,.25);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.62));padding:12px;min-height:150px;display:flex;flex-direction:column;gap:9px;cursor:pointer;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease}
  .v58-option-card:hover{transform:translateY(-1px);border-color:rgba(255,220,135,.7);box-shadow:0 12px 24px rgba(0,0,0,.28)}
  .v58-option-card.voted-here{border-color:rgba(255,220,135,.86);box-shadow:0 0 0 2px rgba(213,157,70,.18),0 14px 28px rgba(0,0,0,.35)}
  .v58-option-name{font-family:Impact,"Arial Black",sans-serif;color:#ffd98b;text-transform:uppercase;letter-spacing:1px;font-size:22px;line-height:1}
  .v58-option-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;font-family:monospace;color:rgba(255,255,255,.58);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
  .v58-tag-zone{flex:1;display:flex;align-items:center;align-content:flex-start;gap:7px;flex-wrap:wrap;border:1px dashed rgba(255,255,255,.13);border-radius:12px;padding:8px;background:rgba(0,0,0,.25)}
  .v58-vote-tag{width:112px;height:44px;object-fit:contain;border-radius:7px;filter:drop-shadow(0 7px 8px rgba(0,0,0,.58));background:rgba(0,0,0,.18)}
  .v58-vote-fallback{border:1px solid rgba(213,157,70,.38);border-radius:999px;padding:6px 9px;color:#f3d28f;font-family:Impact,"Arial Black",sans-serif;text-transform:uppercase;letter-spacing:.8px;font-size:13px;background:rgba(0,0,0,.55)}
  .v58-empty-tags{font-family:monospace;color:rgba(255,255,255,.38);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
  .v58-admin-panel{margin-top:16px;padding:12px;border:1px solid rgba(213,157,70,.18);border-radius:16px;background:rgba(0,0,0,.25)}
  .v58-admin-grid{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}.v58-admin-grid input{margin-top:8px}
  @media(max-width:760px){.v58-vote-top,.v58-admin-grid{grid-template-columns:1fr}.v58-preview-tag{width:128px}.v58-vote-tag{width:98px;height:39px}.v58-options{grid-template-columns:1fr}}
</style>
<script>
(function(){
  const V58_STORE_PREFIX = 'poolUpdates:v57:';
  const V58_SELECTED_PREFIX = 'poolUpdates:v58:selectedTeam:';
  function esc(x){return String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function norm(x){return String(x||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');}
  function poolName(){try{return typeof V57_POOL_NAME!=='undefined'?V57_POOL_NAME:(document.title||'Pool');}catch(e){return document.title||'Pool';}}
  function storeKey(){return V58_STORE_PREFIX + poolName().replace(/\s+/g,'-').toLowerCase();}
  function selectedKey(){return V58_SELECTED_PREFIX + poolName().replace(/\s+/g,'-').toLowerCase();}
  function teams(){
    try{if(typeof TEAMS!=='undefined' && Array.isArray(TEAMS))return TEAMS;}catch(e){}
    try{if(typeof DATA!=='undefined' && DATA && Array.isArray(DATA.teams))return DATA.teams;}catch(e){}
    return [];
  }
  function teamName(t){return String((t&&t.name)||'');}
  function teamKey(t){return String((t&&t.id)||teamName(t));}
  function dogSrc(t){
    const nm=teamName(t);
    try{if(typeof dogtagSrc==='function'){const s=dogtagSrc(t); if(s)return s;}}catch(e){}
    try{if(typeof DOGTAGS!=='undefined' && DOGTAGS && DOGTAGS[nm])return DOGTAGS[nm];}catch(e){}
    return (t&&t.dogtag)||'';
  }
  function teamByKey(key){const list=teams(); return list.find(t=>teamKey(t)===key)||list.find(t=>norm(teamName(t))===norm(key))||null;}
  function loadUpdates(){try{return JSON.parse(localStorage.getItem(storeKey())||'[]');}catch(e){return [];}}
  function saveUpdates(q){localStorage.setItem(storeKey(),JSON.stringify(q));}
  function defaultUpdates(){let q=loadUpdates(); if(!q.length){q=[{id:'q_'+Date.now(),question:'Should we use NHL award winners on the ticker all offseason?',options:['Yes','No','Only until draft day'],votes:{}}];saveUpdates(q);} return q;}
  function selectedTeam(){return localStorage.getItem(selectedKey())||'';}
  function validVoteEntries(q){
    const valid=new Set(teams().map(teamKey));
    return Object.entries(q.votes||{}).filter(([k,v])=>valid.has(k) && (q.options||[]).includes(v));
  }
  function tagHtml(t){
    if(!t)return '';
    const src=dogSrc(t), nm=teamName(t);
    return src?`<img class="v58-vote-tag" src="${esc(src)}" title="${esc(nm)}" alt="${esc(nm)} dog tag" loading="lazy">`:`<span class="v58-vote-fallback" title="${esc(nm)}">${esc(nm)}</span>`;
  }
  function pickerHtml(){
    const sel=selectedTeam();
    const opts=['<option value="">Select your team...</option>'].concat(teams().map(t=>`<option value="${esc(teamKey(t))}" ${teamKey(t)===sel?'selected':''}>${esc(teamName(t))}</option>`)).join('');
    const t=teamByKey(sel);
    const preview=t?(dogSrc(t)?`<img class="v58-preview-tag" src="${esc(dogSrc(t))}" alt="${esc(teamName(t))} dog tag" loading="lazy"><span>${esc(teamName(t))} selected. Click an option below to place your dog tag.</span>`:`<b>${esc(teamName(t))}</b><span> selected. Click an option below to place your dog tag.</span>`):'Choose your team first. Your dog tag will appear on the option you vote for.';
    return `<div class="v58-vote-top"><div class="v58-team-picker"><label for="v58TeamSelect">Select your team</label><select id="v58TeamSelect" onchange="v58SelectTeam(this.value)">${opts}</select></div><div class="v58-selected-preview">${preview}</div></div>`;
  }
  function questionCard(q){
    const entries=validVoteEntries(q);
    const total=entries.length;
    const selected=selectedTeam();
    const optionCards=(q.options||[]).map(opt=>{
      const voters=entries.filter(([k,v])=>v===opt).map(([k])=>teamByKey(k)).filter(Boolean);
      const count=voters.length, pct=total?Math.round(count/total*100):0;
      const here=selected && (q.votes||{})[selected]===opt;
      const tags=voters.length?voters.map(tagHtml).join(''):'<span class="v58-empty-tags">No dog tags here yet</span>';
      return `<button type="button" class="v58-option-card${here?' voted-here':''}" onclick="v58CastTeamVote('${esc(q.id)}','${esc(opt)}')"><div class="v58-option-name">${esc(opt)}</div><div class="v58-option-meta"><span>${count} vote${count===1?'':'s'}</span><span>${pct}%</span></div><span class="v57-bar"><span class="v57-fill" style="width:${pct}%"></span></span><div class="v58-tag-zone">${tags}</div></button>`;
    }).join('');
    return `<article class="v57-question-card"><div class="v57-award-kicker">${esc(q.question)}</div><div class="v57-small">${total} team vote${total===1?'':'s'} · pick your team above, then click an option. Re-click another option to move your dog tag.</div><div class="v58-options">${optionCards}</div></article>`;
  }
  function buildPage(){
    const q=defaultUpdates();
    return `<div class="v57-page"><div class="v57-title">Pool Updates</div><div class="v57-note">Voting is now tied to the team dropdown. Each team can appear once per question, and changing a vote moves that team dog tag to the new choice.</div>${pickerHtml()}<div id="v57Questions">${q.map(questionCard).join('')}</div><div class="v58-admin-panel"><div class="v58-admin-label">Admin: add a question</div><div class="v58-admin-grid"><div><textarea id="v57Question" placeholder="Admin: type a new question"></textarea><input id="v57Options" placeholder="Options separated by commas, ex: Yes, No, Maybe"></div><button class="v57-button" onclick="v57AddQuestion()">Add Question</button></div></div></div>`;
  }
  window.v58SelectTeam=function(key){localStorage.setItem(selectedKey(),key||''); try{render();}catch(e){window.render&&window.render();}};
  window.v58CastTeamVote=function(id,opt){
    const key=selectedTeam();
    if(!key){alert('Select your team from the dropdown first.');return;}
    const qs=loadUpdates(); const q=qs.find(x=>String(x.id)===String(id)); if(!q)return;
    q.votes=q.votes||{}; q.votes[key]=opt; saveUpdates(qs); try{render();}catch(e){window.render&&window.render();}
  };
  const oldAdd=window.v57AddQuestion;
  window.v57AddQuestion=function(){
    const qtxt=document.getElementById('v57Question')?.value.trim();
    const opts=(document.getElementById('v57Options')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(!qtxt||opts.length<2){alert('Add a question and at least two comma-separated options.');return;}
    const qs=loadUpdates(); qs.unshift({id:'q_'+Date.now(),question:qtxt,options:opts,votes:{}}); saveUpdates(qs); try{render();}catch(e){window.render&&window.render();}
  };
  const oldRender=window.render;
  window.render=function(){
    try{if(typeof view!=='undefined' && view==='poolupdates'){const board=document.getElementById('board'); if(board){board.innerHTML=buildPage(); return;}}}catch(e){}
    return oldRender&&oldRender.apply(this,arguments);
  };
})();
</script>
'''

for path in files:
    s = path.read_text(encoding='utf-8')
    if 'V58 pool updates dogtag voting override' in s:
        continue
    # append before closing body for strongest override
    lower = s.lower()
    idx = lower.rfind('</body>')
    if idx == -1:
        s += v58
    else:
        s = s[:idx] + v58 + '\n' + s[idx:]
    path.write_text(s, encoding='utf-8')
