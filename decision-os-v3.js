// Decision OS V3 — Universal Inbox + Active Project Limit
(() => {
  const EXT_KEY='decisionos.v3', DECISION_KEY='decisionos.v1', STOIC_KEY='stoic30.v2', LIMIT=2;
  let ext=loadExt(), processingInboxId=null, openingFromInbox=false;

  function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function normalizeExt(x){
    x=x&&typeof x==='object'?x:{};
    const stages=x.projectStages&&typeof x.projectStages==='object'?{...x.projectStages}:{};
    Object.keys(stages).forEach(id=>{if(!['active','backlog','frozen'].includes(stages[id]))stages[id]='backlog';});
    return {version:1,inbox:Array.isArray(x.inbox)?x.inbox.filter(i=>i&&String(i.text||'').trim()).map(i=>({id:i.id||Date.now()+Math.random(),text:String(i.text).trim(),createdAt:i.createdAt||Date.now()})):[],projectStages:stages,settings:{activeProjectLimit:LIMIT}};
  }
  function loadExt(){try{return normalizeExt(JSON.parse(localStorage.getItem(EXT_KEY)));}catch(_){return normalizeExt(null);}}
  function saveExt(){localStorage.setItem(EXT_KEY,JSON.stringify(ext));}
  function decisions(){try{const x=JSON.parse(localStorage.getItem(DECISION_KEY));return Array.isArray(x?.decisions)?x.decisions:[];}catch(_){return[];}}
  function stage(id){return ext.projectStages[String(id)]||'backlog';}
  function activeProjects(excludeId=null){return decisions().filter(x=>String(x.id)!==String(excludeId??'')&&x.category==='專案'&&x.status!=='closed'&&stage(x.id)==='active');}
  function todayKey(){return new Date().toLocaleDateString('sv-SE');}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

  function injectStyles(){
    if(document.getElementById('decisionOsV3Style'))return;
    const s=document.createElement('style');s.id='decisionOsV3Style';s.textContent=`
      .universal-inbox-form{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.universal-inbox-form input{min-width:0}
      .inbox-list{display:grid;gap:8px;margin-top:10px}.inbox-item,.project-chip{border:1px solid var(--line);border-radius:13px;padding:10px 11px;background:white}
      .inbox-item-text{font-size:13px;line-height:1.45;word-break:break-word}.inbox-item-meta{font-size:10px;color:var(--muted);margin-top:4px}
      .project-limit-meter{display:flex;align-items:center;gap:8px;margin-top:12px}.project-limit-bar{height:8px;flex:1;border-radius:999px;background:var(--surface2);overflow:hidden}.project-limit-fill{height:100%;background:var(--warm)}
      .project-chip{margin-top:8px}.project-stage-row.hidden{display:none}@media(max-width:430px){.universal-inbox-form{grid-template-columns:1fr}.universal-inbox-form .btn{width:100%}}`;
    document.head.appendChild(s);
  }
  function injectInbox(){
    if(document.getElementById('universalInboxCard'))return;
    const today=document.getElementById('today');if(!today)return;
    const card=document.createElement('div');card.id='universalInboxCard';card.className='card';card.innerHTML=`
      <div class="row between"><div><div class="eyebrow">Universal Inbox</div><h2>先記下來，不用現在分類</h2></div><span class="badge" id="universalInboxCount">0 件</span></div>
      <p>任務、點子、研究主題都先放這裡，真正要做時再轉成 Decision。</p>
      <div class="universal-inbox-form"><input id="universalInboxInput" maxlength="240" placeholder="例如：研究 Codex 新的 sub-agent 工作流"><button class="btn secondary" onclick="addUniversalInboxItem()">加入 Inbox</button></div>
      <div id="universalInboxPreview" class="inbox-list"></div><div style="height:8px"></div><button class="btn ghost block" onclick="openUniversalInbox()">查看全部 Inbox</button>`;
    const d=document.getElementById('decisionHomeCard');if(d)d.insertAdjacentElement('beforebegin',card);else today.querySelector('.hero')?.insertAdjacentElement('afterend',card);
    card.querySelector('#universalInboxInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.addUniversalInboxItem();}});
  }
  function injectProjectCard(){
    if(document.getElementById('activeProjectLimitCard'))return;
    const screen=document.getElementById('principles');if(!screen||screen.dataset.decisionOs!=='2')return;
    const card=document.createElement('div');card.id='activeProjectLimitCard';card.className='card';card.innerHTML=`
      <div class="row between"><div><div class="eyebrow">Project Focus</div><h2>Active Project Limit</h2></div><span class="badge warm" id="activeProjectLimitBadge">0 / ${LIMIT}</span></div>
      <p>同時最多 ${LIMIT} 個 Active 專案。新專案預設進 Backlog，只有真正要推進的才升成 Active。</p>
      <div class="project-limit-meter"><div class="project-limit-bar"><div id="activeProjectLimitFill" class="project-limit-fill"></div></div><span class="muted" id="activeProjectBacklogCount">Backlog 0</span></div><div id="activeProjectList"></div>`;
    screen.firstElementChild?.insertAdjacentElement('afterend',card);
  }
  function inboxHtml(i){const d=new Date(i.createdAt);const stamp=`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;return `<div class="inbox-item"><div class="inbox-item-text">${esc(i.text)}</div><div class="inbox-item-meta">${stamp}</div><div class="row" style="margin-top:8px"><button class="btn secondary small" onclick="processUniversalInboxItem(${i.id})">轉成 Decision</button><button class="btn ghost small" onclick="deleteUniversalInboxItem(${i.id})">刪除</button></div></div>`;}
  function renderInbox(){
    const xs=[...ext.inbox].sort((a,b)=>b.createdAt-a.createdAt);const c=document.getElementById('universalInboxCount');if(c)c.textContent=`${xs.length} 件`;
    const p=document.getElementById('universalInboxPreview');if(p)p.innerHTML=xs.length?xs.slice(0,3).map(inboxHtml).join(''):'<p>Inbox 是空的。新的想法可以先丟進來，不需要立刻開專案。</p>';
    const f=document.getElementById('universalInboxFullList');if(f)f.innerHTML=xs.length?xs.map(inboxHtml).join(''):'<p>Inbox 是空的。</p>';
  }
  function renderProjects(){
    const ds=decisions(),active=ds.filter(x=>x.category==='專案'&&x.status!=='closed'&&stage(x.id)==='active'),backlog=ds.filter(x=>x.category==='專案'&&x.status!=='closed'&&stage(x.id)==='backlog');
    const b=document.getElementById('activeProjectLimitBadge');if(b)b.textContent=`${active.length} / ${LIMIT}`;
    const fill=document.getElementById('activeProjectLimitFill');if(fill)fill.style.width=`${Math.min(100,active.length/LIMIT*100)}%`;
    const bc=document.getElementById('activeProjectBacklogCount');if(bc)bc.textContent=`Backlog ${backlog.length}`;
    const list=document.getElementById('activeProjectList');if(list)list.innerHTML=active.length?active.map(x=>`<div class="project-chip"><div class="row between"><b>${esc(x.title||'未命名專案')}</b><span class="badge warm">Active</span></div><div class="muted" style="font-size:11px;margin-top:4px">${esc(x.nextAction||'尚未設定下一步')}</div><div style="margin-top:7px"><button class="btn ghost small" onclick="openDecisionEditor(${x.id})">查看 / 修改</button></div></div>`).join(''):'<p>目前沒有 Active 專案。</p>';
  }
  function renderV3(){injectStyles();injectInbox();injectProjectCard();renderInbox();renderProjects();}

  window.addUniversalInboxItem=function(){const input=document.getElementById('universalInboxInput'),text=String(input?.value||'').trim();if(!text){alert('先寫下一句想記住的事情。');return;}ext.inbox.push({id:Date.now()+Math.floor(Math.random()*1000),text,createdAt:Date.now()});saveExt();if(input)input.value='';renderInbox();if(typeof toast==='function')toast('已加入 Universal Inbox');};
  window.openUniversalInbox=function(){if(typeof openSheet!=='function')return;openSheet('Universal Inbox','先收集，再決定','<p class="muted">只有決定真的要處理時，才把項目轉成 Decision。</p><div id="universalInboxFullList" class="inbox-list"></div>');renderInbox();};
  window.deleteUniversalInboxItem=function(id){ext.inbox=ext.inbox.filter(x=>String(x.id)!==String(id));if(String(processingInboxId)===String(id))processingInboxId=null;saveExt();renderInbox();};
  window.processUniversalInboxItem=function(id){const item=ext.inbox.find(x=>String(x.id)===String(id));if(!item||typeof window.openDecisionEditor!=='function')return;processingInboxId=id;if(typeof closeSheet==='function')closeSheet();openingFromInbox=true;window.openDecisionEditor();openingFromInbox=false;const t=document.getElementById('dTitle');if(t){t.value=item.text;t.focus();}};

  const baseOpen=window.openDecisionEditor;
  if(typeof baseOpen==='function')window.openDecisionEditor=function(id){
    if(!openingFromInbox)processingInboxId=null;baseOpen(id);const cat=document.getElementById('dCategory'),status=document.getElementById('dStatus');if(!cat||!status)return;
    const row=document.createElement('div');row.id='dProjectStageRow';row.className='project-stage-row';row.innerHTML=`<label>專案狀態</label><select id="dProjectStage"><option value="backlog">Backlog — 先保留，不開始</option><option value="active">Active — 現在真的要推進</option><option value="frozen">Frozen — 暫停，不佔 Active 名額</option></select><div class="hint">Active 同時最多 ${LIMIT} 個；超過上限時不會儲存。</div>`;
    status.parentNode?.insertBefore(row,status.nextSibling);row.querySelector('select').value=id?stage(id):'backlog';const sync=()=>row.classList.toggle('hidden',cat.value!=='專案');cat.addEventListener('change',sync);sync();
  };

  const baseSave=window.saveDecisionEditor;
  if(typeof baseSave==='function')window.saveDecisionEditor=function(id){
    const cat=document.getElementById('dCategory')?.value,selected=document.getElementById('dProjectStage')?.value||'backlog';
    if(cat==='專案'&&selected==='active'&&activeProjects(id).length>=LIMIT){alert(`Active 專案已達 ${LIMIT} 個上限。請先把另一個 Active 專案移到 Backlog 或 Frozen。`);return;}
    const before=localStorage.getItem(DECISION_KEY)||'',ids=new Set(decisions().map(x=>String(x.id)));baseSave(id);const after=localStorage.getItem(DECISION_KEY)||'';if(before===after)return;
    const target=id||decisions().find(x=>!ids.has(String(x.id)))?.id;if(target!=null){if(cat==='專案')ext.projectStages[String(target)]=selected;else delete ext.projectStages[String(target)];}
    if(!id&&processingInboxId!=null&&target!=null){ext.inbox=ext.inbox.filter(x=>String(x.id)!==String(processingInboxId));processingInboxId=null;}saveExt();renderV3();
  };

  const baseDelete=window.deleteDecision;if(typeof baseDelete==='function')window.deleteDecision=function(id){const before=localStorage.getItem(DECISION_KEY)||'';baseDelete(id);if(before!==(localStorage.getItem(DECISION_KEY)||'')){delete ext.projectStages[String(id)];saveExt();renderV3();}};
  const baseReopen=window.reopenDecision;if(typeof baseReopen==='function')window.reopenDecision=function(id){const x=decisions().find(d=>String(d.id)===String(id));if(x?.category==='專案'&&stage(id)==='active'&&activeProjects(id).length>=LIMIT){alert(`Active 專案已達 ${LIMIT} 個上限。先釋出一個名額再重新開啟。`);return;}baseReopen(id);renderV3();};
  ['keepDecisionOpen','saveDecisionReview'].forEach(name=>{const base=window[name];if(typeof base==='function')window[name]=function(...args){const out=base(...args);renderV3();return out;};});

  const baseReset=window.resetAll;if(typeof baseReset==='function')window.resetAll=function(){const had=localStorage.getItem(DECISION_KEY)!==null;const out=baseReset();if(had&&localStorage.getItem(DECISION_KEY)===null)localStorage.removeItem(EXT_KEY);return out;};
  const baseRestore=window.restoreJSON;window.restoreJSON=function(ev){const f=ev.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(x?.format==='stoic30-decisionos-backup'){if(!confirm('匯入會取代目前瀏覽器的 Stoic 30、Decision OS 與 Inbox / Project Focus 資料。確定繼續？'))return;if(x.stoic30)localStorage.setItem(STOIC_KEY,JSON.stringify(x.stoic30));if(x.decisionOS)localStorage.setItem(DECISION_KEY,JSON.stringify(x.decisionOS));localStorage.setItem(EXT_KEY,JSON.stringify(normalizeExt(x.decisionOSV3)));if(typeof toast==='function')toast('完整備份已還原');setTimeout(()=>location.reload(),350);return;}if(typeof baseRestore==='function')return baseRestore(ev);alert('這個檔案不是有效的備份。');}catch(_){alert('這個檔案不是有效的 JSON 備份。');}finally{ev.target.value='';}};r.readAsText(f);};
  window.exportJSON=function(){let stoic=null,decisionOS=null;try{stoic=JSON.parse(localStorage.getItem(STOIC_KEY));}catch(_){}try{decisionOS=JSON.parse(localStorage.getItem(DECISION_KEY));}catch(_){}const backup={format:'stoic30-decisionos-backup',version:2,exportedAt:new Date().toISOString(),stoic30:stoic,decisionOS,decisionOSV3:ext};download(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`stoic30-decisionos-backup-${todayKey()}.json`);};

  saveExt();renderV3();
})();
