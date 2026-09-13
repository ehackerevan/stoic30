// Decision OS V3 extension â€” Universal Inbox + Active Project Limit
// Loaded after decision-os.js. Keeps existing decisionos.v1 data intact.
(() => {
  const EXT_KEY = 'decisionos.v3';
  const DECISION_KEY = 'decisionos.v1';
  const STOIC_KEY = 'stoic30.v2';
  const DEFAULT_LIMIT = 2;
  const projectStageLabels = {
    active: 'Active',
    backlog: 'Backlog',
    frozen: 'Frozen'
  };

  function esc(s='') {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function nowId() { return Date.now() + Math.floor(Math.random() * 1000); }
  function todayKey(){ return new Date().toLocaleDateString('sv-SE'); }
  function normalizeExt(raw) {
    const x = raw && typeof raw === 'object' ? raw : {};
    const inbox = Array.isArray(x.inbox) ? x.inbox.map((item, i) => ({
      id: item?.id || nowId() + i,
      text: String(item?.text || '').trim(),
      createdAt: item?.createdAt || Date.now(),
      updatedAt: item?.updatedAt || item?.createdAt || Date.now()
    })).filter(item => item.text) : [];
    const projectStages = x.projectStages && typeof x.projectStages === 'object' ? {...x.projectStages} : {};
    Object.keys(projectStages).forEach(id => {
      if (!['active','backlog','frozen'].includes(projectStages[id])) projectStages[id] = 'backlog';
    });
    const limit = Number(x.settings?.activeProjectLimit);
    return {
      version: 1,
      inbox,
      projectStages,
      settings: { activeProjectLimit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT }
    };
  }
  function loadExt() {
    try { return normalizeExt(JSON.parse(localStorage.getItem(EXT_KEY))); }
    catch (_) { return normalizeExt(null); }
  }
  function persistExt() { localStorage.setItem(EXT_KEY, JSON.stringify(ext)); }
  function loadDecisions() {
    try {
      const raw = JSON.parse(localStorage.getItem(DECISION_KEY));
      return Array.isArray(raw?.decisions) ? raw.decisions : [];
    } catch (_) { return []; }
  }
  function decisionById(id) { return loadDecisions().find(x => String(x.id) === String(id)); }
  function activeProjects(excludeId=null) {
    return loadDecisions().filter(x => {
      const id = String(x.id);
      return String(x.id) !== String(excludeId ?? '') &&
        x.category === 'å°ˆæ›ˆ' &&
        x.status !== 'closed' &&
        ext.projectStages[id] === 'active';
    });
  }
  function stageFor(id) { return ext.projectStages[String(id)] || 'backlog'; }
  function downloadFile(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  let ext = loadExt();
  let processingInboxId = null;
  let openingFromInbox = false;

  function injectStyles() {
    if (document.getElementById('decisionOsV3Style')) return;
    const s = document.createElement('style');
    s.id = 'decisionOsV3Style';
    s.textContent = `
      .universal-inbox-form{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}
      .universal-inbox-form input{min-width:0}
      .inbox-list{display:grid;gap:8px;margin-top:10px}
      .inbox-item{border:1px solid var(--line);border-radius:13px;padding:10px 11px;background:white}
      .inbox-item-text{font-size:13px;line-height:1.45;word-break:break-word}
      .inbox-item-meta{font-size:10px;color:var(--muted);margin-top:4px}
      .project-limit-meter{display:flex;align-items:center;gap:8px;margin-top:12px}
      .project-limit-bar{height:8px;flex:1;border-radius:999px;background:var(--surface2);overflow:hidden}
      .project-limit-fill{height:100%;background:var(--warm);transition:width .2s ease}
      .project-chip{border:1px solid var(--line);border-radius:13px;padding:10px 11px;background:white;margin-top:8px}
      .project-chip b{font-size:13px}
      .project-stage-row.hidden{display:none}
      @media(max-width:430px){.universal-inbox-form{grid-template-columns:1fr}.universal-inbox-form .btn{width:100%}}
    `;
    document.head.appendChild(s);
  }

  function injectInboxCard() {
    if (document.getElementById('universalInboxCard')) return;
    const today = document.getElementById('today');
    if (!today) return;
    const card = document.createElement('div');
    card.id = 'universalInboxCard';
    card.className = 'card';
    card.innerHTML = `
      <div class="row between">
        <div><div class="eyebrow">Universal Inbox</div><h2>å…ˆè¨˜ä¸‹ä¾†ï¼Œä¸ç”¨ç¾åœ¨åˆ†é¡</h2></div>
        <span class="badge" id="universalInboxCount">0 ä»¶</span>
      </div>
      <p>æƒ³åˆ°ä»»å‹™ã€é»å­ã€æƒ³ç ”ç©¶çš„æ±è¥¿ï¼Œéƒ½å…ˆæ”¾é€™è£¡ã€‚çœŸæ­£è¦åšæ™‚å†è½‰æˆ Decisionã€‚</p>
      <div class="universal-inbox-form">
        <input id="universalInboxInput" type="text" maxlength="240" placeholder="ä¾‹å¦‚ï¼šç ”ç©¶ Codex æ–°çš„ sub-agent å·¥ä½œæµ">
        <button class="btn secondary" onclick="addUniversalInboxItem()">åŠ å…¥ Inbox</button>
      </div>
      <div id="universalInboxPreview" class="inbox-list"></div>
      <div style="height:8px"></div><button class="btn ghost block" onclick="openUniversalInbox()">æŸ¥çœ‹å…¨éƒ¨ Inbox</button>
    `;
    const decisionCard = document.getElementById('decisionHomeCard');
    if (decisionCard) decisionCard.insertAdjacentElement('beforebegin', card);
    else today.querySelector('.hero')?.insertAdjacentElement('afterend', card);
    const input = card.querySelector('#universalInboxInput');
    input?.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); window.addUniversalInboxItem(); }
    });
  }

  function injectProjectLimitCard() {
    if (document.getElementById('activeProjectLimitCard')) return;
    const screen = document.getElementById('principles');
    if (!screen || screen.dataset.decisionOs !== '2') return;
    const card = document.createElement('div');
    card.id = 'activeProjectLimitCard';
    card.className = 'card';
    card.innerHTML = `
      <div class="row between">
        <div><div class="eyebrow">Project Focus</div><h2>Active Project Limit</h2></div>
        <span class="badge warm" id="activeProjectLimitBadge">0 / ${ext.settings.activeProjectLimit}</span>
      </div>
      <p>åŒæ™‚æœ€å¤šåªå…è¨± ${ext.settings.activeProjectLimit} å€‹ Active å°ˆæ›ˆã€‚æ–°çš„å°ˆæ›ˆå…ˆé€² Backlogï¼Œé™¤éä½ çœŸçš„é‡‹å‡ºä¸€å€‹ Active åé¡ã€‚</p>
      <div class="project-limit-meter"><div class="project-limit-bar"><div id="activeProjectLimitFill" class="project-limit-fill" style="width:0%"></div></div><span class="muted" id="activeProjectBacklogCount">Backlog 0</span></div>
      <div id="activeProjectList"></div>
    `;
    screen.firstElementChild?.insertAdjacentElement('afterend', card);
  }

  function renderInbox() {
    const items = [...ext.inbox].sort((a,b) => b.createdAt - a.createdAt);
    const count = document.getElementById('universalInboxCount');
    if (count) count.textContent = `${items.length} ä»¶`;
    const preview = document.getElementById('universalInboxPreview');
    if (preview) {
      preview.innerHTML = items.length ? items.slice(0,3).map(inboxItemHtml).join('') : '<p>Inbox æ˜¯ç©ºçš„ã€‚æ–°çš„æƒ³æ³•å¯ä»¥å…ˆä¸Ÿé€²ä¾†ï¼Œä¸éœ€è¦ç«‹åˆ»é–‹å°ˆæ¡ˆã€‚</p>';
    }
    const full = document.getElementById('universalInboxFullList');
    if (full) full.innerHTML = items.length ? items.map(inboxItemHtml).join('') : '<p>Inbox æ˜¯ç©ºçš„ã€‚</p>';
  }

  function toInboxItemHtml(item) {
    const d = new Date(item.createdAt);
    const stamp = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `<div class="inbox-item">
      <div class="inbox-item-text">${esc(item.text)}</div>
      <div class="inbox-item-meta">${stamp}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn secondary small" onclick="processUniversalInboxItem(${item.id})">è½‰æˆ Decision</button>
        <button class="btn ghost small" onclick="deleteUniversalInboxItem(${item.id})">åˆªé™¤</button>
      </div>
    </div>`;
  }

  function renderProjects() {
    const decisions = loadDecisions();
    const active = decisions.filter(x => x.category === 'å°ˆæ¡ˆ' && x.status !== 'closed' && stageFor(x.id) === 'active');
    const backlog = decisions.filter(x => x.category === 'å°ˆæ›ˆ' && x.status !== 'closed' && stageFor(x.id) === 'backlog');
    const limit = ext.settings.activeProjectLimit;
    const badge = document.getElementById('activeProjectLimitBadge');
    if (badge) badge.textContent = `${active.length} / ${limit}`;
    const fill = document.getElementById('activeProjectLimitFill');
    if (fill) fill.style.width = `${Math.min(100, Math.round(active.length / limit * 100))}%`;
    const backlogCount = document.getElementById('activeProjectBacklogCount');
    if (backlogCount) backlogCount.textContent = `Backlog ${backlog.length}`;
    const list = document.getElementById('activeProjectList');
    if (list) {
      list.innerHTML = active.length ? active.map(x => `<div class="project-chip"><div class="row between"><b>${esc(x.title || 'æœªå‘½åå°ˆæ¡ˆ')}</b><span class="badge warm">Active</span></div><div class="muted" style="font-size:11px;margin-top:4px">${esc(x.nextAction || 'å°šæœªæ‰‹å®šä¸‹ä¸€æ­¥')}</div><div style="margin-top:7px"><button class="btn ghost small" onclick="openDecisionEditor(${x.id})">æŸ¥çœ‹ / ä¿®æ”¹</button></div></div>`).join('') : '<p>ç›®å‰æ²’æœ‰ Active å°ˆæ¡ˆã€‚å¾ Backlog æŒ‘çœŸçš„è¦æ¨çš„é …ç›®å³å¯ã€‚</p>';
    }
  }

  function renderV3() {
    injectStyles();
    injectInboxCard();
    injectProjectLimitCard();
    renderInbox();
    renderProjects();
  }

  window.addUniversalInboxItem = function() {
    const input = document.getElementById('universalInboxInput');
    const text = String(input?.value || '').trim();
    if (!text) { alert('å…ˆå¯«ä¸‹ä¸€å¥æƒ³è¨˜ä½çš„äº‹æƒ…ã€‚'); return; }
    ext.inbox.push({id: nowId(), text, createdAt: Date.now(), updatedAt: Date.now()});
    persistExt();
    if (input) input.value = '';
    renderInbox();
    if (typeof toast === 'function') toast('å·²åŠ å…¥ Universal Inbox');
  };

  window.openUniversalInbox = function() {
    if (typeof openSheet !== 'function') return;
    openSheet('Universal Inbox', 'å…ˆæ”ºé›”å†æ±ºå®š", `(€€€€€€ñÀ±…ÍÌô‰µÕÑ•ˆû–g¢‡’â7šb¿–ú–úšâ–Z»–>«š&/VÛ’öƒšÆë–ºk’ê’şwš†¢š¢fWBšf¾ò3š&7š*+¦‚n»–&7¢ö'š"@•¥Í¥½»ğ½Àø(€€€€€€ñ‘¥Ø¥ô‰Õ¹¥Ù•ÉÍ…±%¹‰½áÕ±±1¥ÍĞˆ±…ÍÌô‰¥¹‰½àµ±¥ÍĞˆøğ½‘¥Øø(€€€t¤ì(€€€É•¹‘•É%¹‰½à ¤ì(€ôì((€İ¥¹‘½Ü¹‘•±•Ñ•U¹¥Ù•ÉÍ…±%¹‰½á%Ñ•´€ô™Õ¹Ñ¥½¸¡¥¤ì(€€€•áĞ¹¥¹‰½à€ô•áĞ¹¥¹‰½à¹™¥±Ñ•È¡à€ôøMÑÉ¥¹œ¡à¹¥¤€„ôôMÑÉ¥¹œ¡¥¤¤ì(€€€¥˜€¡MÑÉ¥¹œ¡ÁÉ½•ÍÍ¥¹%¹‰½á%¤€ôôôMÑÉ¥¹œ¡¥¤¤ÁÉ½•ÍÍ¥¹%¹‰½á%€ô¹Õ±°ì(€€€Á•ÉÍ¥ÍÑáĞ ¤ìÉ•¹‘•É%¹‰½à ¤ì(€ôì((€İ¥¹‘½Ü¹ÁÉ½•ÍÍU¹¥Ù•ÉÍ…±%¹‰½á%Ñ•´€ô™Õ¹Ñ¥½¸¡¥¤ì(€€€½¹ÍĞ¥Ñ•´€ô•áĞ¹¥¹‰½à¹™¥¹¡à€ôøMÑÉ¥¹œ¡à¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€¥˜€ …¥Ñ•´ñğÑåÁ•½˜İ¥¹‘½Ü¹½Á•¹•¥Í¥½¹‘¥Ñ½È€„ôô€™Õ¹Ñ¥½¸œ¤É•ÑÕÉ¸ì(€€€ÁÉ½•ÍÍ¥¹%¹‰½á%€ô¥ì(€€€¥˜€¡ÑåÁ•½˜±½Í•M¡••Ğ€ôôô€™Õ¹Ñ¥½¸œ¤±½Í•M¡••Ğ ¤ì(€€€½Á•¹¥¹É½µ%¹‰½à€ôÑÉÕ”ì(€€€İ¥¹‘½Ü¹½Á•¹•¥Í¥½¹‘¥Ñ½È ¤ì(€€€½Á•¹¥¹É½µ%¹‰½à€ô™…±Í”ì(€€€½¹ÍĞÑ¥Ñ±”€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘Q¥Ñ±”œ¤ì(€€€¥˜€¡Ñ¥Ñ±”¤ìÑ¥Ñ±”¹Ù…±Õ”€ô¥Ñ•´¹Ñ•áĞìÑ¥Ñ±”¹™½ÕÌ ¤ìô(€ôì((€½¹ÍĞ‰…Í•=Á•¹•¥Í¥½¹‘¥Ñ½È€ôİ¥¹‘½Ü¹½Á•¹•¥Í¥½¹‘¥Ñ½Èì(€¥˜€¡ÑåÁ•½˜‰…Í•=Á•¹•¥Í¥½¹‘¥Ñ½È€ôôô€™Õ¹Ñ¥½¸œ¤ì(€€€İ¥¹‘½Ü¹½Á•¹•¥Í¥½¹‘¥Ñ½È€ô™Õ¹Ñ¥½¸¡¥¤ì(€€€€€¥˜€ …½Á•¹¥¹É½µ%¹‰½à¤ÁÉ½•ÍÍ¥¹%¹‰½á%€ô¹Õ±°ì(€€€€€‰…Í•=Á•¹•¥Í¥½¹‘¥Ñ½È¡¥¤ì(€€€€€½¹ÍĞ…Ñ•½Éä€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘…Ñ•½Éäœ¤ì(€€€€€¥˜€ ……Ñ•½Éä¤É•ÑÕÉ¸ì(€€€€€½¹ÍĞÉ½Ü€ô‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‘¥Øœ¤ì(€€€€€É½Ü¹¥€ô€‘AÉ½©•ÑMÑ…•I½Üœì(€€€€€É½Ü¹±…ÍÍ9…µ”€ô€ÁÉ½©•ĞµÍÑ…”µÉ½Üœì(€€€€€É½Ü¹¥¹¹•É!Q50€ô€(€€€€€€€€ñ±…‰•°û–Â#š†#.š,ğ½±…‰•°ø(€€€€€€€€ñÍ•±•Ğ¥ô‰‘AÉ½©•ÑMÑ…”ˆø(€€€€€€€€€€ñ½ÁÑ¥½¸Ù…±Õ”ô‰‰…­±½œˆù	…­±½œƒŠPƒ–#’şw––+¾ò3’â7–¾ç–$ğ½½ÁÑ¥½¸ø(€€€€€€€€€€ñ½ÁÑ¥½¸Ù…±Õ”ô‰…Ñ¥Ù”ˆùÑ¥Ù”ƒŠPƒ>û–r£rj¢šš:£¦Èğ½½ÁÑ¥½¸ø(€€€€€€€€€€ñ½ÁÑ¥½¸Ù…±Õ”ô‰™É½é•¸ˆùÉ½é•¸ƒŠPƒšŠo–s¾ò3’â7’öPÑ¥Ù”ƒ–B7¦†4ğ½½ÁÑ¥½¸ø(€€€€€€€€ğ½Í•±•Ğø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰¡¥¹ĞˆùÑ¥Ù”ƒ–B3šfšr–’h€‘í•áĞ¹Í•ÑÑ¥¹Ì¹…Ñ¥Ù•AÉ½©•Ñ1¥µ¥Ñôƒ–/¢Ú¦;¦fCšf’â7šr–
Ë–¶cğ½‘¥Øø(€€€€€€ì(€€€€€½¹ÍĞÍÑ…ÑÕÌ€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘MÑ…ÑÕÌœ¤ì(€€€€€ÍÑ…ÑÕÌü¹Á…É•¹Ñ9½‘”ü¹¥¹Í•ÉÑ	•™½É”¡É½Ü°ÍÑ…ÑÕÌ¹¹•áÑM¥‰±¥¹œ¤ì(€€€€€½¹ÍĞÍ•±•Ğ€ôÉ½Ü¹ÅÕ•ÉåM•±•Ñ½È œ‘AÉ½©•ÑMÑ…”œ¤ì(€€€€€Í•±•Ğ¹Ù…±Õ”€ô¥€üÍÑ…•½È¡¥¤€è€‰…­±½œœì(€€€€€½¹ÍĞÍå¹Y¥Í¥‰¥±¥Ñä€ô€ ¤€ôøÉ½Ü¹±…ÍÍ1¥ÍĞ¹Ñ½±” ¡¥‘‘•¸œ°…Ñ•½Éä¹Ù…±Õ”€„ôô€Ÿ–Â#š† œ¤ì(€€€€€…Ñ•½Éä¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ¡…¹”œ°Íå¹Y¥Í¥‰¥±¥Ñä¤ì(€€€€€Íå¹Y¥Í¥‰¥±¥Ñä ¤ì(€€€ôì(€ô((€½¹ÍĞ‰…Í•M…Ù••¥Í¥½¹‘¥Ñ½È€ôİ¥¹‘½Ü¹Í…Ù••¥Í¥½¹‘¥Ñ½Èì(€¥˜€¡ÑåÁ•½˜‰…Í•M…Ù••¥Í¥½¹‘¥Ñ½È€ôôô€™Õ¹Ñ¥½¸œ¤ì(€€€İ¥¹‘½Ü¹Í…Ù••¥Í¥½¹‘¥Ñ½È€ô™Õ¹Ñ¥½¸¡¥¤ì(€€€€€½¹ÍĞ…Ñ•½Éä€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘…Ñ•½Éäœ¤ü¹Ù…±Õ”ì(€€€€€½¹ÍĞÍ•±•Ñ•‘MÑ…”€ô‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% ‘AÉ½©•ÑMÑ…”œ¤ü¹Ù…±Õ”ñğ€‰…­±½œœì(€€€€€½¹ÍĞ±¥µ¥Ğ€ô•áĞ¹Í•ÑÑ¥¹Ì¹…Ñ¥Ù•AÉ½©•Ñ1¥µ¥Ğì(€€€€€¥˜€¡…Ñ•½Éä€ôôô€Ÿ–Â#š† œ€˜˜Í•±•Ñ•‘MÑ…”€ôôô€…Ñ¥Ù”œ€˜˜…Ñ¥Ù•AÉ½©•ÑÌ¡¥¤¹±•¹Ñ €øô±¥µ¥Ğ¤ì(€€€€€€€…±•ÉĞ¡Ñ¥Ù”ƒ–Â#šn#–ŞË¦W–"À€‘í±¥µ¥Ñôƒ–/’â+¦fC¢®#–#š.+–>›’â–,Ñ¥Ù”ƒ–Â#šn#ï–"À	…­±½œƒš"XÉ½é•»	€¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€½¹ÍĞ‰•™½É”€ô±½…±MÑ½É…”¹•Ñ%Ñ•´¡%M%=9}-d¤ñğ€œœì(€€€€€½¹ÍĞ‰•™½É•%‘Ì€ô¹•ÜM•Ğ¡±½…‘•¥Í¥½¹Ì ¤¹µ…À¡à€ôøMÑÉ¥¹œ¡à¹¥¤¤¤ì(€€€€€‰…Í•M…Ù••¥Í¥½¹‘¥Ñ½È¡¥¤ì(€€€€€½¹ÍĞ…™Ñ•È€ô±½…±MÑ½É…”¹•Ñ%Ñ•´¡%M%=9}-d¤ñğ€œœì(€€€€€¥˜€¡‰•™½É”€ôôô…™Ñ•È¤É•ÑÕÉ¸ì(€€€€€½¹ÍĞ…™Ñ•É•¥Í¥½¹Ì€ô±½…‘•¥Í¥½¹Ì ¤ì(€€€€€½¹ÍĞÑ…É•Ñ%€ô¥ñğ…™Ñ•É•¥Í¥½¹Ì¹™¥¹¡à€ôø€…‰•™½É•%‘Ì¹¡…Ì¡MÑÉ¥¹œ¡à¹¥¤¤¤ü¹¥ì(€€€€€¥˜€¡Ñ…É•Ñ%€„ô¹Õ±°¤ì(€€€€€€€¥˜€¡…Ñ•½Éä€ôôô€Ÿ–Â#š† œ¤•áĞ¹ÁÉ½©•ÑMÑ…•ÍmMÑÉ¥¹œ¡Ñ…É•Ñ%¥t€ôÍ•±•Ñ•‘MÑ…”ì(€€€€€€€•±Í”‘•±•Ñ”•áĞ¹ÁÉ½©•ÑMÑ…•ÍmMÑÉ¥¹œ¡Ñ…É•Ñ%¥tì(€€€€€ô(€€€€€¥˜€ …¥€˜˜ÁÉ½•ÍÍ¥¹%¹‰½á%€„ô¹Õ±°€˜˜Ñ…É•Ñ%€„ô¹Õ±°¤ì(€€€€€€€•áĞ¹¥¹‰½à€ô•áĞ¹¥¹‰½à¹™¥±Ñ•È¡à€ôøMÑÉ¥¹œ¡à¹¥¤€„ôôMÑÉ¥¹œ¡ÁÉ½•ÍÍ¥¹%¹‰½á%¤¤ì(€€€€€€€ÁÉ½•ÍÍ¥¹%¹‰½á%€ô¹Õ±°ì(€€€€€ô(€€€€€Á•ÉÍ¥ÍÑáĞ ¤ìÉ•¹‘•ÉXÌ ¤ì(€€€ôì(€ô((€½¹ÍĞ‰…Í••±•Ñ••¥Í¥½¸€ôİ¥¹‘½Ü¹‘•±•Ñ••¥Í¥½¸ì(€¥˜€¡ÑåÁ•½˜‰…Í••±•Ñ••¥Í¥½¸€ôôô€™Õ¹Ñ¥½¸œ¤ì(€€€İ¥¹‘½Ü¹‘•±•Ñ••¥Í¥½¸€ô™Õ¹Ñ¥½¸¡¥¤ì(€€€€€½¹ÍĞ‰•™½É”€ô±½…±MÑ½É…”¹•Ñ%Ñ•´¡%M%=9}-d¤ñğ€œœì(€€€€€‰…Í••±•Ñ••¥Í¥½¸¡¥¤ì(€€€€€½¹ÍĞ…™Ñ•È€ô±½…±MÑ½É…”¹•Ñ%Ñ•´¡%M%=9}-d¤ñğ€œœì(€€€€€¥˜€¡‰•™½É”€„ôô…™Ñ•È¤ì(€€€€€€€‘•±•Ñ”•áĞ¹ÁÉ½©•ÑMÑ…•ÍmMÑÉ¥¹œ¡¥¥tìÁ•ÉÍ¥ÍÑáĞ ¤ìÉ•¹‘•ÉXÌ ¤ì(€€€€€ô(€€€ôì(€ô((€½¹ÍĞ‰…Í•I•½Á•¹•¥Í¥½¸€ôİ¥¹‘½Ü¹É•½Á•¹•¥Í¥½¸ì(€¥˜€¡ÑåÁ•½˜‰…Í•I•½Á•¹•¥Í¥½¸€ôôô€™Õ¹Ñ¥½¸œ¤ì(€€€İ¥¹‘½Ü¹É•½Á•¹•¥Í¥½¸€ô™Õ¹Ñ¥½¸¡¥¤ì(€€€€€½¹ÍĞà€ô‘•¥Í¥½¹	å%¡¥¤ì(€€€€€¥˜€¡àü¹…Ñ•½Éä€ôôô€Ÿ–Â#šn œ€˜˜ÍÑ…•½È¡¥¤€ôôô€…Ñ¥Ù”œ€˜˜…Ñ¥Ù•AÉ½©•ÑÌ¡¥¤¹±•¹Ñ €øô•áĞ¹Í•ÑÑ¥¹Ì¹…Ñ¥Ù•AÉ½©•Ñ1¥µ¥Ğ¤ì(€€€€€€€…±•ÉĞ¡Ñ¥Ù”ƒ–Â#šn#–ŞË¦W–"À€‘í•áĞ¹Í•ÑÑ¥¹Ì¹…Ñ¥Ù•AÉ½©•Ñ1¥µ¥Ñôƒ–/’â+¦fC–#¦7–ë’â–-Ñ¥Ù”ƒ–B7¦†7¾ò3–7–B7¦/šZÃ¦^/–’Ÿj–Â#š†#	€¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€‰…Í•I•½Á•¹•¥Í¥½¸¡¥¤ìÉ•¹‘•ÉXÌ ¤ì(€€€ôì(€ô((€l­••Á•¥Í¥½¹=Á•¸œ°Í…Ù••¥Í¥½¹I•Ù¥•Üt¹™½É… ¡¹…µ”€ôøì(€€€½¹ÍĞ‰…Í”€ôİ¥¹‘½İm¹…µ•tì(€€€¥˜€¡ÑåÁ•½˜‰…Í”€„ôô€™Õ¹Ñ¥½¸œ¤É•ÑÕÉ¸ì(€€€İ¥¹‘½İm¹…µ•t€ô™Õ¹Ñ¥½¸ ¸¸¹…ÉÌ¤ì½¹ÍĞ½ÕĞ€ô‰…Í” ¸¸¹…ÉÌ¤ìÉ•¹‘•ÉXÌ ¤ìÉ•ÑÕÉ¸½ÕĞìôì(€ô¤ì((€½¹ÍĞ‰…Í•I•Í•Ñ±°€ôİ¥¹‘½Ü¹É•Í•Ñ±°ì(€¥˜€¡ÑåÁ•½˜‰…Í•I•Í•Ñ±°€ôôô€™Õ¹Ñ¥½¸œ¤ì(€€€İ¥¹‘½Ü¹É•Í•Ñ±°€ô™Õ¹Ñ¥½¸ ¤ì(€€€€€½¹ÍĞ¡…‘•¥Í¥½¹…Ñ„€ô±½…±MÑ½É…”¹•Ñ%Ñ•´¡%M%=9}-d¤€„ôô¹Õ±°ì(€€€€€½¹ÍĞ½ÕĞ€ô‰…Í•I•Í•Ñ±° ¤ì(€€€€€¥˜€¡¡…‘•¥Í¥½¹…Ñ„€˜˜±½…±MÑ½É…”¹•Ñ%Ñ•´¡%M%=9}-d¤€ôôô¹Õ±°¤±½…±MÑ½É…”¹É•µ½Ù•%Ñ•´¡aQ}-d¤ì(€€€€€É•ÑÕÉ¸½ÕĞì(€€€ôì(€ô((€½¹ÍĞ‰…Í•I•ÍÑ½É•)M=8€ôİ¥¹‘½Ü¹É•ÍÑ½É•)M=8ì(€İ¥¹‘½Ü¹É•ÍÑ½É•)M=8€ô™Õ¹Ñ¥½¸¡•Ø¤ì(€€€½¹ÍĞ˜€ô•Ø¹Ñ…É•Ğ¹™¥±•Ìü¹lÁtì¥˜€ …˜¤É•ÑÕÉ¸ì(€€€½¹ÍĞÈ€ô¹•Ü¥±•I•…‘•È ¤ì(€€€È¹½¹±½…€ô€ ¤€ôøì(€€€€€ÑÉäì(€€€€€€€½¹ÍĞ¥¹½µ¥¹œ€ô)M=8¹Á…ÉÍ”¡È¹É•ÍÕ±Ğ¤ì(€€€€€€€¥˜€¡¥¹½µ¥¹œü¹™½Éµ…Ğ€ôôô€ÍÑ½¥ŒÌÀµ‘•¥Í¥½¹½Ìµ‰…­ÕÀœ¤ì(€€€€€€€€€¥˜€ …½¹™¥É´ ŸJÚ"s}yÈ¬Š‰ÎH‰Û£Ï®ˆŞrÑhrë™]\›ÂˆYˆ
[˜ÛÛZ[™ËœİÚXÌÌ
HØØ[İÜ˜YÙKœÙ]][JÕÒP×ÒÑVK”ÓÓ‹œİš[™ÚYJ[˜ÛÛZ[™ËœİÚXÌÌ
JNÂˆYˆ
[˜ÛÛZ[™Ë™XÚ\Ú[Û“ÔÊHØØ[İÜ˜YÙKœÙ]][JPÒTÒSÓ—ÒÑVK”ÓÓ‹œİš[™ÚYJ[˜ÛÛZ[™Ë™XÚ\Ú[Û“ÔÊJNÂˆØØ[İÜ˜YÙKœÙ]][JVÒÑVK”ÓÓ‹œİš[™ÚYJ›Ü›X[^™Q^
[˜ÛÛZ[™Ë™XÚ\Ú[Û“ÔÕŒÊJJNÂˆYˆ
\[ÙˆØ\İOOH	Ù[˜İ[Û‰ÊHØ\İ
	ùk£9¥m9`¦y.ïymìº`¡9c§ÉÊNÂˆÙ][Y[İ]


HOˆØØ][Û‹œ™[ØY

KÍL
NÂˆ™]\›ÂˆBˆYˆ
\[Ùˆ˜\ÙT™\İÜ™R”ÓÓˆOOH	Ù[˜İ[Û‰ÊH™]\›ˆ˜\ÙT™\İÜ™R”ÓÓŠ]ŠNÂˆ[\
	ú`&y`"ùª¥9¦â9.#y¦+ù§"y¥b9æ¡9`¦y.ïxà ‰ÊNÂˆHØ]Ú
ÊHÈ[\
	ú`&y`"ùª¥9¨b9.#y¦+ù§"y¥b9æ¡”ÓÓˆ9`¦y.ïxà ‰ÊNÈBˆš[˜[HÈ]‹\™Ù]˜[YHH	ÉÎÈBˆNÂˆ‹œ™XY\Õ^
ŠNÂˆNÂ‚ˆÚ[™İË™^Ü”ÓÓˆH[˜İ[ÛŠ
HÂˆ]İÚXÈH[XÚ\Ú[Û“ÔÈH[ÂˆHÈİÚXÈH”ÓÓ‹œ\œÙJØØ[İÜ˜YÙK™Ù]][JÕÒP×ÒÑVJJNÈHØ]Ú
ÊHßBˆHÈXÚ\Ú[Û“ÔÈH”ÓÓ‹œ\œÙJØØ[İÜ˜YÙK™Ù]][JPÒTÒSÓ—ÒÑVJJNÈHØ]Ú
ÊHßBˆÛÛœİ˜XÚİ\HÂˆ›Ü›X]ˆ	ÜİÚXÌÌYXÚ\Ú[Û›ÜËX˜XÚİ\	Ëˆ™\œÚ[Ûˆ‹ˆ^ÜY]ˆ™]È]J
KÒTÓÔİš[™Ê
KˆİÚXÌÌˆİÚXËˆXÚ\Ú[Û“ÔËˆXÚ\Ú[Û“ÔÕŒÎˆ^ˆNÂˆİÛ›ØYš[J™]È›ØŠÒ”ÓÓ‹œİš[™ÚYJ˜XÚİ\[ŠWKİ\N‰Ø\XØ][Û‹ÚœÛÛ‰ßJKİÚXÌÌYXÚ\Ú[Û›ÜËX˜XÚİ\IİÙ^RÙ^J
_KšœÛÛ˜
NÂˆNÂ‚ˆ\œÚ\İ^

NÂˆ™[™\•ŒÊ
NÂ‚ˆËÈHXÚ\Ú[ÛˆÔÈØÜ™Y[ˆ\ÈÛÛ™\YŞ[˜Ú›Û›İ\ÛHÙ^K]ÙY\\ÈØœÙ\™\‚ˆËÈÛÈHŒÈØ\™È™XÛİ™\ˆYˆH˜\ÙH\™K\™[™\œÈ]ØÜ™Y[ˆ]\‹‚ˆÛÛœİØœÙ\™\ˆH™]È]]][Û“ØœÙ\™\Š

HOˆÂˆYˆ
YØİ[Y[™Ù][[Y[RY
	İ[š]™\œØ[[˜›ŞØ\™	ÊHYØİ[Y[™Ù][[Y[RY
	ØXİ]™T›Ú™Xİ[Z]Ø\™	ÊJH™[™\•ŒÊ
NÂˆJNÂˆØœÙ\™\‹›ØœÙ\™JØİ[Y[˜›ÙKØÚ[\İYKİX™YNY_JNÂŸJJ
NÂ