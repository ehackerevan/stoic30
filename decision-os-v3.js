// Decision OS V3 extension — Universal Inbox + Active Project Limit
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
        x.category === '專案' &&
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
        <div><div class="eyebrow">Universal Inbox</div><h2>先記下來，不用現在分類</h2></div>
        <span class="badge" id="universalInboxCount">0 件</span>
      </div>
      <p>想到任務、點子、想研究的東西，都先放這裡。真正要做時再轉成 Decision。</p>
      <div class="universal-inbox-form">
        <input id="universalInboxInput" type="text" maxlength="240" placeholder="例如：研究 Codex 新的 sub-agent 工作流">
        <button class="btn secondary" onclick="addUniversalInboxItem()">加入 Inbox</button>
      </div>
      <div id="universalInboxPreview" class="inbox-list"></div>
      <div style="height:8px"></div><button class="btn ghost block" onclick="openUniversalInbox()">查看全部 Inbox</button>
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
      <p>同時最多只允許 ${ext.settings.activeProjectLimit} 個 Active 專案。新的專案先進 Backlog，除非你真的釋出一個 Active 名額。</p>
      <div class="project-limit-meter"><div class="project-limit-bar"><div id="activeProjectLimitFill" class="project-limit-fill" style="width:0%"></div></div><span class="muted" id="activeProjectBacklogCount">Backlog 0</span></div>
      <div id="activeProjectList"></div>
    `;
    screen.firstElementChild?.insertAdjacentElement('afterend', card);
  }

  function renderInbox() {
    const items = [...ext.inbox].sort((a,b) => b.createdAt - a.createdAt);
    const count = document.getElementById('universalInboxCount');
    if (count) count.textContent = `${items.length} 件`;
    const preview = document.getElementById('universalInboxPreview');
    if (preview) {
      preview.innerHTML = items.length ? items.slice(0,3).map(inboxItemHtml).join('') : '<p>Inbox 是空的。新的想法可以先丟進來，不需要立刻開專案。</p>';
    }
    const full = document.getElementById('universalInboxFullList');
    if (full) full.innerHTML = items.length ? items.map(inboxItemHtml).join('') : '<p>Inbox 是空的。</p>';
  }

  function inboxItemHtml(item) {
    const d = new Date(item.createdAt);
    const stamp = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `<div class="inbox-item">
      <div class="inbox-item-text">${esc(item.text)}</div>
      <div class="inbox-item-meta">${stamp}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn secondary small" onclick="processUniversalInboxItem(${item.id})">轉成 Decision</button>
        <button class="btn ghost small" onclick="deleteUniversalInboxItem(${item.id})">刪除</button>
      </div>
    </div>`;
  }

  function renderProjects() {
    const decisions = loadDecisions();
    const active = decisions.filter(x => x.category === '專案' && x.status !== 'closed' && stageFor(x.id) === 'active');
    const backlog = decisions.filter(x => x.category === '專案' && x.status !== 'closed' && stageFor(x.id) === 'backlog');
    const limit = ext.settings.activeProjectLimit;
    const badge = document.getElementById('activeProjectLimitBadge');
    if (badge) badge.textContent = `${active.length} / ${limit}`;
    const fill = document.getElementById('activeProjectLimitFill');
    if (fill) fill.style.width = `${Math.min(100, Math.round(active.length / limit * 100))}%`;
    const backlogCount = document.getElementById('activeProjectBacklogCount');
    if (backlogCount) backlogCount.textContent = `Backlog ${backlog.length}`;
    const list = document.getElementById('activeProjectList');
    if (list) {
      list.innerHTML = active.length ? active.map(x => `<div class="project-chip"><div class="row between"><b>${esc(x.title || '未命名專案')}</b><span class="badge warm">Active</span></div><div class="muted" style="font-size:11px;margin-top:4px">${esc(x.nextAction || '尚未設定下一步')}</div><div style="margin-top:7px"><button class="btn ghost small" onclick="openDecisionEditor(${x.id})">查看 / 修改</button></div></div>`).join('') : '<p>目前沒有 Active 專案。從 Backlog 挑真正要推進的項目即可。</p>';
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
    if (!text) { alert('先寫下一句想記住的事情。'); return; }
    ext.inbox.push({id: nowId(), text, createdAt: Date.now(), updatedAt: Date.now()});
    persistExt();
    if (input) input.value = '';
    renderInbox();
    if (typeof toast === 'function') toast('已加入 Universal Inbox');
  };

  window.openUniversalInbox = function() {
    if (typeof openSheet !== 'function') return;
    openSheet('Universal Inbox', '先收集，再決定', `
      <p class="muted">這裡不是待辦清單。只有當你決定真的要處理時，才把項目轉成 Decision。</p>
      <div id="universalInboxFullList" class="inbox-list"></div>
    `);
    renderInbox();
  };

  window.deleteUniversalInboxItem = function(id) {
    ext.inbox = ext.inbox.filter(x => String(x.id) !== String(id));
    if (String(processingInboxId) === String(id)) processingInboxId = null;
    persistExt(); renderInbox();
  };

  window.processUniversalInboxItem = function(id) {
    const item = ext.inbox.find(x => String(x.id) === String(id));
    if (!item || typeof window.openDecisionEditor !== 'function') return;
    processingInboxId = id;
    if (typeof closeSheet === 'function') closeSheet();
    openingFromInbox = true;
    window.openDecisionEditor();
    openingFromInbox = false;
    const title = document.getElementById('dTitle');
    if (title) { title.value = item.text; title.focus(); }
  };

  const baseOpenDecisionEditor = window.openDecisionEditor;
  if (typeof baseOpenDecisionEditor === 'function') {
    window.openDecisionEditor = function(id) {
      if (!openingFromInbox) processingInboxId = null;
      baseOpenDecisionEditor(id);
      const category = document.getElementById('dCategory');
      if (!category) return;
      const row = document.createElement('div');
      row.id = 'dProjectStageRow';
      row.className = 'project-stage-row';
      row.innerHTML = `
        <label>專案狀態</label>
        <select id="dProjectStage">
          <option value="backlog">Backlog — 先保留，不開始</option>
          <option value="active">Active — 現在真的要推進</option>
          <option value="frozen">Frozen — 暫停，不佔 Active 名額</option>
        </select>
        <div class="hint">Active 同時最多 ${ext.settings.activeProjectLimit} 個。超過限制時不會儲存。</div>
      `;
      const status = document.getElementById('dStatus');
      status?.parentNode?.insertBefore(row, status.nextSibling);
      const select = row.querySelector('#dProjectStage');
      select.value = id ? stageFor(id) : 'backlog';
      const syncVisibility = () => row.classList.toggle('hidden', category.value !== '專案');
      category.addEventListener('change', syncVisibility);
      syncVisibility();
    };
  }

  const baseSaveDecisionEditor = window.saveDecisionEditor;
  if (typeof baseSaveDecisionEditor === 'function') {
    window.saveDecisionEditor = function(id) {
      const category = document.getElementById('dCategory')?.value;
      const selectedStage = document.getElementById('dProjectStage')?.value || 'backlog';
      const limit = ext.settings.activeProjectLimit;
      if (category === '專案' && selectedStage === 'active' && activeProjects(id).length >= limit) {
        alert(`Active 專案已達 ${limit} 個上限。請先把另一個 Active 專案移到 Backlog 或 Frozen。`);
        return;
      }
      const before = localStorage.getItem(DECISION_KEY) || '';
      const beforeIds = new Set(loadDecisions().map(x => String(x.id)));
      baseSaveDecisionEditor(id);
      const after = localStorage.getItem(DECISION_KEY) || '';
      if (before === after) return;
      const afterDecisions = loadDecisions();
      const targetId = id || afterDecisions.find(x => !beforeIds.has(String(x.id)))?.id;
      if (targetId != null) {
        if (category === '專案') ext.projectStages[String(targetId)] = selectedStage;
        else delete ext.projectStages[String(targetId)];
      }
      if (!id && processingInboxId != null && targetId != null) {
        ext.inbox = ext.inbox.filter(x => String(x.id) !== String(processingInboxId));
        processingInboxId = null;
      }
      persistExt(); renderV3();
    };
  }

  const baseDeleteDecision = window.deleteDecision;
  if (typeof baseDeleteDecision === 'function') {
    window.deleteDecision = function(id) {
      const before = localStorage.getItem(DECISION_KEY) || '';
      baseDeleteDecision(id);
      const after = localStorage.getItem(DECISION_KEY) || '';
      if (before !== after) {
        delete ext.projectStages[String(id)]; persistExt(); renderV3();
      }
    };
  }

  const baseReopenDecision = window.reopenDecision;
  if (typeof baseReopenDecision === 'function') {
    window.reopenDecision = function(id) {
      const x = decisionById(id);
      if (x?.category === '專案' && stageFor(id) === 'active' && activeProjects(id).length >= ext.settings.activeProjectLimit) {
        alert(`Active 專案已達 ${ext.settings.activeProjectLimit} 個上限。先釋出一個 Active 名額，再重新開啟這個專案。`);
        return;
      }
      baseReopenDecision(id); renderV3();
    };
  }

  ['keepDecisionOpen','saveDecisionReview'].forEach(name => {
    const base = window[name];
    if (typeof base !== 'function') return;
    window[name] = function(...args) { const out = base(...args); renderV3(); return out; };
  });

  const baseResetAll = window.resetAll;
  if (typeof baseResetAll === 'function') {
    window.resetAll = function() {
      localStorage.removeItem(EXT_KEY);
      return baseResetAll();
    };
  }

  const baseRestoreJSON = window.restoreJSON;
  window.restoreJSON = function(ev) {
    const f = ev.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const incoming = JSON.parse(r.result);
        if (incoming?.format === 'stoic30-decisionos-backup') {
          if (!confirm('匯入會取代目前瀏覽器的 Stoic 30、Decision OS 與 Inbox / Project Focus 資料。確定繼續？')) return;
          if (incoming.stoic30) localStorage.setItem(STOIC_KEY, JSON.stringify(incoming.stoic30));
          if (incoming.decisionOS) localStorage.setItem(DECISION_KEY, JSON.stringify(incoming.decisionOS));
          localStorage.setItem(EXT_KEY, JSON.stringify(normalizeExt(incoming.decisionOSV3)));
          if (typeof toast === 'function') toast('完整備份已還原');
          setTimeout(() => location.reload(), 350);
          return;
        }
        if (typeof baseRestoreJSON === 'function') return baseRestoreJSON(ev);
        alert('這個檔案不是有效的備份。');
      } catch (_) { alert('這個檔案不是有效的 JSON 備份。'); }
      finally { ev.target.value = ''; }
    };
    r.readAsText(f);
  };

  window.exportJSON = function() {
    let stoic = null, decisionOS = null;
    try { stoic = JSON.parse(localStorage.getItem(STOIC_KEY)); } catch (_) {}
    try { decisionOS = JSON.parse(localStorage.getItem(DECISION_KEY)); } catch (_) {}
    const backup = {
      format: 'stoic30-decisionos-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      stoic30: stoic,
      decisionOS,
      decisionOSV3: ext
    };
    downloadFile(new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'}), `stoic30-decisionos-backup-${todayKey()}.json`);
  };

  persistExt();
  renderV3();

  // The Decision OS screen is converted synchronously today, but keep this observer
  // so the V3 cards recover if the base app re-renders that screen later.
  const observer = new MutationObserver(() => {
    if (!document.getElementById('universalInboxCard') || !document.getElementById('activeProjectLimitCard')) renderV3();
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();
