// Decision OS V2 — local-first decision and uncertainty management
// Keeps existing Stoic 30 storage untouched and upgrades decisionos.v1 data in place.

(() => {
  const KEY = 'decisionos.v1';
  const STOIC_KEY = 'stoic30.v2';
  const statuses = {
    action: '需要行動',
    waiting: '等待中',
    review: '待回顧',
    closed: '已完成'
  };
  const resultLabels = {
    better: '比預期好',
    expected: '大致符合預期',
    worse: '比預期差',
    unclear: '沒有明確結果'
  };
  const assumptionLabels = {
    confirmed: '有被證實',
    not_confirmed: '沒有被證實',
    partial: '部分符合',
    unknown: '仍無法判斷'
  };

  function todayKey(){ return new Date().toLocaleDateString('sv-SE'); }
  function esc(s=''){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function splitLines(v){ return String(v||'').split('\n').map(x=>x.trim()).filter(Boolean); }
  function lines(v){ return (v||[]).join('\n'); }
  function downloadFile(blob,name){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function normalizeDecision(x,i=0){
    const validStatus = ['action','waiting','review','closed'].includes(x?.status) ? x.status : 'action';
    return {
      id: x?.id || Date.now()+i,
      createdAt: x?.createdAt || Date.now(),
      updatedAt: x?.updatedAt || x?.createdAt || Date.now(),
      title: x?.title || '',
      category: x?.category || '其他',
      status: validStatus,
      fact: Array.isArray(x?.fact) ? x.fact : [],
      assumptions: Array.isArray(x?.assumptions) ? x.assumptions : [],
      control: Array.isArray(x?.control) ? x.control : [],
      influence: Array.isArray(x?.influence) ? x.influence : [],
      outside: Array.isArray(x?.outside) ? x.outside : [],
      nextAction: x?.nextAction || '',
      reviewAt: x?.reviewAt || '',
      outcome: x?.outcome || '',
      hasWaited: !!x?.hasWaited || validStatus === 'waiting',
      review: {
        result: x?.review?.result || '',
        actualOutcome: x?.review?.actualOutcome || x?.outcome || '',
        assumptionResult: x?.review?.assumptionResult || '',
        lesson: x?.review?.lesson || '',
        reviewedAt: x?.review?.reviewedAt || null
      }
    };
  }
  function normalizeState(d){
    d = d && typeof d === 'object' ? d : {};
    return {version:2, decisions:Array.isArray(d.decisions) ? d.decisions.map(normalizeDecision) : []};
  }
  function load(){
    try { return normalizeState(JSON.parse(localStorage.getItem(KEY))); }
    catch (_) { return normalizeState(null); }
  }

  let state = load();
  function persist(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function save(){ persist(); renderDecisionOS(); }
  function byId(id){ return state.decisions.find(x => x.id === id); }
  function dueToday(x){ return !!(x.reviewAt && x.reviewAt <= todayKey() && x.status !== 'closed'); }
  function reviewedItems(){ return state.decisions.filter(x => x.status === 'closed' && x.review?.reviewedAt); }
  function badgeClass(status){ return status === 'waiting' ? 'warm' : status === 'closed' ? 'gray' : ''; }
  function fmtDate(v){ return v || '未設定'; }

  function injectStyles(){
    if (document.getElementById('decisionOsStyle')) return;
    const s = document.createElement('style');
    s.id = 'decisionOsStyle';
    s.textContent = `
      .decision-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
      .decision-list{display:grid;gap:10px;margin-top:12px}
      .decision-item{border:1px solid var(--line);background:white;border-radius:15px;padding:13px}
      .decision-item.due{border-color:#c5a27f;background:#fffaf4}
      .decision-item h3{margin:0 0 5px;font-size:15px}
      .decision-meta{font-size:11px;color:var(--muted);margin-top:4px}
      .decision-next{margin-top:8px;padding:9px 10px;border-radius:11px;background:var(--surface2);font-size:12px}
      .decision-lock{margin-top:8px;padding:9px 10px;border-radius:11px;background:var(--warmSoft);color:var(--warm);font-size:12px}
      .decision-columns{display:grid;grid-template-columns:1fr;gap:9px}
      .decision-box{border:1px solid var(--line);border-radius:13px;padding:11px;background:white}
      .decision-box b{display:block;font-size:12px;margin-bottom:4px}
      .decision-section-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-end}
      .insight-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px}
      .reality-row{padding:11px 0;border-bottom:1px solid var(--line)}
      .reality-row:last-child{border-bottom:0}
      .reality-assumption{font-size:12px;color:var(--muted);margin-top:4px}
      .reality-outcome{font-size:12px;margin-top:5px}
      @media(min-width:640px){.decision-columns{grid-template-columns:1fr 1fr 1fr}.insight-grid{grid-template-columns:repeat(4,1fr)}}
    `;
    document.head.appendChild(s);
  }

  function injectHomeCard(){
    if (document.getElementById('decisionHomeCard')) return;
    const today = document.getElementById('today');
    if (!today) return;
    const card = document.createElement('div');
    card.id = 'decisionHomeCard';
    card.className = 'card';
    card.innerHTML = `
      <div class="row between"><div><div class="eyebrow">Decision OS</div><h2>目前真正需要處理的事</h2></div><button class="btn secondary small" onclick="openDecisionEditor()">＋ 新事件</button></div>
      <div class="decision-summary">
        <div class="mini"><div class="n" id="decisionActionCount">0</div><div class="k">需要行動</div></div>
        <div class="mini"><div class="n" id="decisionWaitingCount">0</div><div class="k">等待中</div></div>
        <div class="mini"><div class="n" id="decisionReviewCount">0</div><div class="k">今天需回顧</div></div>
      </div>
      <div id="decisionTodayList" class="decision-list"></div>
      <div style="height:10px"></div><button class="btn ghost block" onclick="go('principles')">進入 Decision OS</button>
    `;
    const hero = today.querySelector('.hero');
    hero?.insertAdjacentElement('afterend', card);
  }

  function convertPrinciplesScreen(){
    const screen = document.getElementById('principles');
    if (!screen || screen.dataset.decisionOs === '2') return;
    screen.dataset.decisionOs = '2';
    screen.innerHTML = `
      <div class="card">
        <div class="row between"><div><div class="eyebrow">Decision OS</div><h2>決策與不確定性</h2></div><button class="btn primary small" onclick="openDecisionEditor()">＋ 新事件</button></div>
        <p>把模糊的反覆思考拆成事實、推測、控制範圍與下一步。等待中的事情，在 Review 日期前不必一直重新分析。</p>
        <div class="decision-summary">
          <div class="mini"><div class="n" id="allDecisionActionCount">0</div><div class="k">需要行動</div></div>
          <div class="mini"><div class="n" id="allDecisionWaitingCount">0</div><div class="k">Waiting Room</div></div>
          <div class="mini"><div class="n" id="allDecisionDueCount">0</div><div class="k">需重新評估</div></div>
        </div>
      </div>
      <div class="card" id="decisionDueCard">
        <div class="decision-section-head"><div><div class="eyebrow">Review</div><h2>今天需要重新評估</h2></div><span class="badge warm" id="decisionDueBadge">0 件</span></div>
        <p>只有 Review 日期到了，或真的出現新資訊，才把等待中的事情拿回來分析。</p>
        <div id="decisionDueList" class="decision-list"></div>
      </div>
      <div class="card">
        <div class="decision-section-head"><div><div class="eyebrow">Action</div><h2>現在需要行動</h2></div><span class="badge" id="decisionActionBadge">0 件</span></div>
        <div id="decisionActionList" class="decision-list"></div>
      </div>
      <div class="card">
        <div class="decision-section-head"><div><div class="eyebrow">Waiting Room</div><h2>目前不需要再想</h2></div><span class="badge warm" id="decisionWaitingBadge">0 件</span></div>
        <p>你已經完成目前能做的部分。除非有新資訊，否則等到 Review 日期再回來。</p>
        <div id="decisionWaitingList" class="decision-list"></div>
      </div>
      <div class="card">
        <div class="decision-section-head"><div><div class="eyebrow">Insights</div><h2>Reality Feedback</h2></div><span class="badge" id="decisionReviewedBadge">0 次回顧</span></div>
        <div class="insight-grid">
          <div class="mini"><div class="n" id="insightReviewed">0</div><div class="k">完成回顧</div></div>
          <div class="mini"><div class="n" id="insightNotConfirmed">—</div><div class="k">推測未被證實</div></div>
          <div class="mini"><div class="n" id="insightWaited">0</div><div class="k">曾進 Waiting</div></div>
          <div class="mini"><div class="n" id="insightTopCategory">—</div><div class="k">最常記錄類型</div></div>
        </div>
        <div id="decisionInsightMessage" class="hint" style="margin-top:12px">完成幾次 Review 後，這裡會開始顯示你的判斷模式。</div>
        <div id="decisionRealityList"></div>
      </div>
      <div class="card"><div class="row between"><h2>已完成</h2><span class="badge gray" id="decisionClosedBadge">0 件</span></div><div id="decisionClosedList" class="decision-list"></div></div>
    `;
    const navBtn = document.querySelector('.nav button[data-screen="principles"]');
    if (navBtn) navBtn.innerHTML = '<span>◇</span>決策';
  }

  function injectSettingsBackup(){
    if (document.getElementById('decisionBackupRow')) return;
    const settingsCard = document.querySelector('#settings .card');
    if (!settingsCard) return;
    const row = document.createElement('div');
    row.id = 'decisionBackupRow';
    row.className = 'settingsRow';
    row.innerHTML = `<div class="label">Decision OS 資料</div><div class="desc">完整備份會同時包含 Stoic 30 與 Decision OS。也可以另外匯出 Decision OS CSV。</div><button class="btn ghost" onclick="exportDecisionCSV()">匯出 Decision CSV</button>`;
    const backupRows = [...settingsCard.querySelectorAll('.settingsRow')];
    const restoreRow = backupRows.find(x=>x.textContent.includes('還原備份'));
    restoreRow?.insertAdjacentElement('beforebegin', row);
  }

  function decisionCard(x, compact=false){
    const due = dueToday(x);
    const review = x.reviewAt ? ` · Review ${esc(x.reviewAt)}` : '';
    const next = x.nextAction ? `<div class="decision-next"><b>下一步：</b>${esc(x.nextAction)}</div>` : '';
    const lock = x.status === 'waiting' && !due ? `<div class="decision-lock">Decision Lock：${esc(fmtDate(x.reviewAt))} 前，不因為同一批資訊重新分析。</div>` : '';
    const reviewBtn = due || x.status === 'review' ? `<button class="btn warm small" onclick="openDecisionReview(${x.id})">開始回顧</button>` : '';
    const finishBtn = x.status !== 'closed' && !reviewBtn ? `<button class="btn secondary small" onclick="openDecisionReview(${x.id})">完成 / 回顧</button>` : '';
    const reopenBtn = x.status === 'closed' ? `<button class="btn secondary small" onclick="reopenDecision(${x.id})">重新開啟</button>` : '';
    const assumption = !compact && x.assumptions?.[0] ? `<div class="muted" style="font-size:12px;margin-top:5px">推測：${esc(x.assumptions[0])}</div>` : '';
    return `<div class="decision-item ${due?'due':''}">
      <div class="row between"><h3>${esc(x.title || '未命名事件')}</h3><span class="badge ${badgeClass(x.status)}">${due && x.status==='waiting' ? '到期 Review' : (statuses[x.status]||x.status)}</span></div>
      <div class="decision-meta">${esc(x.category||'其他')}${review}</div>
      ${compact ? '' : `<div class="muted" style="font-size:12px;margin-top:7px">${x.fact?.[0] ? `事實：${esc(x.fact[0])}` : '尚未填寫事實'}</div>${assumption}`}
      ${next}${lock}
      <div class="row" style="margin-top:9px"><button class="btn ghost small" onclick="openDecisionEditor(${x.id})">查看 / 修改</button>${reviewBtn}${finishBtn}${reopenBtn}</div>
    </div>`;
  }

  function renderInsights(xs){
    const reviewed = reviewedItems();
    const notConfirmed = reviewed.filter(x=>x.review.assumptionResult==='not_confirmed').length;
    const assumptionResolved = reviewed.filter(x=>['confirmed','not_confirmed','partial'].includes(x.review.assumptionResult)).length;
    const rate = assumptionResolved ? Math.round(notConfirmed/assumptionResolved*100) : null;
    const waited = xs.filter(x=>x.hasWaited).length;
    const counts = {};
    xs.forEach(x=>counts[x.category||'其他']=(counts[x.category||'其他']||0)+1);
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const setText = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    setText('insightReviewed', reviewed.length);
    setText('insightNotConfirmed', rate==null?'—':rate+'%');
    setText('insightWaited', waited);
    setText('insightTopCategory', top);
    setText('decisionReviewedBadge', reviewed.length+' 次回顧');
    const msg = document.getElementById('decisionInsightMessage');
    if (msg) {
      if (!reviewed.length) msg.textContent='完成幾次 Review 後，這裡會比較「當初推測」與「實際結果」，而不是只記錄當下感受。';
      else if (assumptionResolved >= 3) msg.textContent=`目前有 ${rate}% 的已判定推測最後沒有被證實。這不是要否定擔心，而是用自己的歷史資料校準判斷。`;
      else msg.textContent='已開始累積 Reality Feedback；再多幾次 Review 後，比例會更有參考價值。';
    }
    const list=document.getElementById('decisionRealityList');
    if(list){
      const recent=[...reviewed].sort((a,b)=>(b.review.reviewedAt||0)-(a.review.reviewedAt||0)).slice(0,5);
      list.innerHTML = recent.length ? `<div class="divider"></div><div class="eyebrow">最近的 Reality Check</div>` + recent.map(x=>`
        <div class="reality-row">
          <div class="row between"><b>${esc(x.title||'未命名事件')}</b><span class="badge gray">${esc(assumptionLabels[x.review.assumptionResult]||'未判定')}</span></div>
          <div class="reality-assumption">當初推測：${esc(x.assumptions?.[0]||'未記錄')}</div>
          <div class="reality-outcome">實際結果：${esc(x.review.actualOutcome||'未記錄')}</div>
        </div>`).join('') : '';
    }
  }

  function renderDecisionOS(){
    injectStyles(); injectHomeCard(); convertPrinciplesScreen(); injectSettingsBackup();
    const xs = [...state.decisions].sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt));
    const action = xs.filter(x=>x.status==='action' && !dueToday(x));
    const waiting = xs.filter(x=>['waiting','review'].includes(x.status) && !dueToday(x));
    const due = xs.filter(dueToday);
    const closed = xs.filter(x=>x.status==='closed');
    const setText = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    setText('decisionActionCount', action.length); setText('decisionWaitingCount', waiting.length); setText('decisionReviewCount', due.length);
    setText('allDecisionActionCount', action.length); setText('allDecisionWaitingCount', waiting.length); setText('allDecisionDueCount', due.length);
    setText('decisionDueBadge', due.length+' 件'); setText('decisionActionBadge', action.length+' 件'); setText('decisionWaitingBadge', waiting.length+' 件'); setText('decisionClosedBadge', closed.length+' 件');
    const home = document.getElementById('decisionTodayList');
    if (home) {
      const focus = [...due, ...action].slice(0,3);
      home.innerHTML = focus.length ? focus.map(x=>decisionCard(x,true)).join('') : '<p>目前沒有需要立即處理的決策。Waiting Room 裡的事情可以先留在那裡。</p>';
    }
    const dueList=document.getElementById('decisionDueList');
    if(dueList) dueList.innerHTML=due.length?due.map(x=>decisionCard(x)).join(''):'<p>今天沒有到期的 Review。</p>';
    const actionList=document.getElementById('decisionActionList');
    if(actionList) actionList.innerHTML=action.length?action.map(x=>decisionCard(x)).join(''):'<p>目前沒有需要立即行動的事件。</p>';
    const waitingList=document.getElementById('decisionWaitingList');
    if(waitingList) waitingList.innerHTML=waiting.length?waiting.map(x=>decisionCard(x)).join(''):'<p>Waiting Room 目前是空的。</p>';
    const closedList = document.getElementById('decisionClosedList');
    if(closedList) closedList.innerHTML = closed.length ? closed.slice(0,20).map(x=>decisionCard(x)).join('') : '<p>尚無已完成紀錄。</p>';
    renderInsights(xs);
  }

  window.openDecisionEditor = function(id){
    const x = id ? byId(id) : normalizeDecision({id:null,title:'',category:'工作',status:'action',fact:[],assumptions:[],control:[],influence:[],outside:[],nextAction:'',reviewAt:''});
    openSheet(id ? '查看 / 修改決策' : '新增事件','Decision OS · Fact → Control → Action',`
      <label>這件事情是什麼？</label>
      <input id="dTitle" type="text" value="${esc(x.title||'')}" placeholder="例如：要不要主動詢問專案進度？">
      <label>分類</label>
      <select id="dCategory">${['工作','人際','金錢','購物','學習','健康生活','旅行','專案','其他'].map(v=>`<option ${x.category===v?'selected':''}>${v}</option>`).join('')}</select>
      <label>目前狀態</label>
      <select id="dStatus"><option value="action" ${x.status==='action'?'selected':''}>需要行動</option><option value="waiting" ${x.status==='waiting'?'selected':''}>等待中</option><option value="review" ${x.status==='review'?'selected':''}>待回顧</option>${x.status==='closed'?'<option value="closed" selected>已完成</option>':''}</select>
      <div class="divider"></div>
      <label>確定的事實</label><textarea id="dFacts" placeholder="一行一件，只寫可以觀察或驗證的內容。">${esc(lines(x.fact))}</textarea>
      <label>目前的推測 / 解讀</label><textarea id="dAssumptions" placeholder="一行一件。這些不是事實，除非之後有證據。">${esc(lines(x.assumptions))}</textarea>
      <div class="divider"></div>
      <div class="decision-columns">
        <div class="decision-box"><b>我能控制</b><textarea id="dControl" placeholder="我的選擇、準備、回覆…">${esc(lines(x.control))}</textarea></div>
        <div class="decision-box"><b>我能影響</b><textarea id="dInfluence" placeholder="可以提高機率，但不能保證…">${esc(lines(x.influence))}</textarea></div>
        <div class="decision-box"><b>不由我控制</b><textarea id="dOutside" placeholder="別人的反應、最終結果…">${esc(lines(x.outside))}</textarea></div>
      </div>
      <label>下一個具體行動</label><input id="dNext" type="text" value="${esc(x.nextAction||'')}" placeholder="例如：週一下午 3 點詢問一次進度">
      <label>何時重新評估？</label><input id="dReview" type="date" value="${esc(x.reviewAt||'')}">
      <div class="hint">如果現在沒有新資訊，設為「等待中」並指定 Review 日期。到期前，Decision Lock 會提醒你不必用同一批資訊重新分析。</div>
      <button class="btn block" onclick="saveDecisionEditor(${id||'null'})">儲存</button>
      ${id ? `<div style="height:8px"></div><button class="btn warm block" onclick="openDecisionReview(${id})">完成 / 回顧這件事</button><div style="height:8px"></div><button class="btn danger block" onclick="deleteDecision(${id})">刪除此事件</button>` : ''}
    `);
  };

  window.saveDecisionEditor = function(id){
    const now = Date.now();
    const current = id ? byId(id) : normalizeDecision({id:now, createdAt:now, updatedAt:now});
    if(!current) return;
    const newStatus=dStatus.value;
    if(['waiting','review'].includes(newStatus) && !dReview.value){ alert('設為等待中或待回顧時，請先設定 Review 日期。'); return; }
    if(!dTitle.value.trim()){ alert('請先替這件事情寫一個簡短標題。'); return; }
    Object.assign(current, {
      title:dTitle.value.trim(), category:dCategory.value, status:newStatus,
      fact:splitLines(dFacts.value), assumptions:splitLines(dAssumptions.value),
      control:splitLines(dControl.value), influence:splitLines(dInfluence.value), outside:splitLines(dOutside.value),
      nextAction:dNext.value.trim(), reviewAt:dReview.value, updatedAt:now
    });
    if(newStatus==='waiting') current.hasWaited=true;
    if(!id) state.decisions.push(current);
    save(); closeSheet(); toast(id ? '決策已更新' : '事件已加入 Decision OS');
  };

  window.openDecisionReview = function(id){
    const x=byId(id); if(!x)return;
    const r=x.review||{};
    openSheet('Reality Review',x.title||'Decision OS',`
      <p class="muted">回顧不是評分自己做得好不好，而是比較「當時怎麼判斷」與「最後實際發生什麼」。</p>
      <div class="decision-box"><b>當初確定的事實</b>${x.fact?.length?x.fact.map(v=>`<div>• ${esc(v)}</div>`).join(''):'<span class="muted">未記錄</span>'}</div>
      <div style="height:9px"></div>
      <div class="decision-box"><b>當初的主要推測</b>${x.assumptions?.length?x.assumptions.map(v=>`<div>• ${esc(v)}</div>`).join(''):'<span class="muted">未記錄</span>'}</div>
      <label>最後的整體結果</label>
      <select id="rResult"><option value="">請選擇</option>${Object.entries(resultLabels).map(([k,v])=>`<option value="${k}" ${r.result===k?'selected':''}>${v}</option>`).join('')}</select>
      <label>實際發生了什麼？</label><textarea id="rActual" placeholder="只寫最後可確認的結果。">${esc(r.actualOutcome||'')}</textarea>
      <label>當初主要擔心 / 推測最後如何？</label>
      <select id="rAssumption"><option value="">請選擇</option>${Object.entries(assumptionLabels).map(([k,v])=>`<option value="${k}" ${r.assumptionResult===k?'selected':''}>${v}</option>`).join('')}</select>
      <label>這次可以留下什麼經驗？</label><textarea id="rLesson" placeholder="例如：資訊不足時，我容易太早把最壞情況當成最可能情況。">${esc(r.lesson||'')}</textarea>
      <div class="hint">完成 Review 後事件會移到「已完成」，並納入 Reality Feedback 統計。</div>
      <button class="btn block" onclick="saveDecisionReview(${id})">完成 Review</button>
      <div style="height:8px"></div><button class="btn ghost block" onclick="keepDecisionOpen(${id})">還沒結束，繼續處理</button>
    `);
  };

  window.saveDecisionReview = function(id){
    const x=byId(id); if(!x)return;
    if(!rActual.value.trim()){ alert('請先寫下實際發生的結果。'); return; }
    x.review={result:rResult.value,actualOutcome:rActual.value.trim(),assumptionResult:rAssumption.value,lesson:rLesson.value.trim(),reviewedAt:Date.now()};
    x.outcome=x.review.actualOutcome; x.status='closed'; x.updatedAt=Date.now();
    save(); closeSheet(); toast('Review 已完成，Reality Feedback 已更新');
  };

  window.keepDecisionOpen = function(id){
    const x=byId(id);if(!x)return;
    x.status='action';x.reviewAt='';x.updatedAt=Date.now();save();closeSheet();toast('已移回需要行動');
  };

  window.reopenDecision = function(id){
    const x=byId(id);if(!x)return;
    x.status='action';x.reviewAt='';x.updatedAt=Date.now();save();toast('已重新開啟這件事');
  };

  window.deleteDecision = function(id){
    if(!confirm('刪除這筆 Decision OS 紀錄？')) return;
    state.decisions=state.decisions.filter(x=>x.id!==id); save(); closeSheet(); toast('紀錄已刪除');
  };

  window.exportDecisionCSV = function(){
    const rows=[['title','category','status','facts','assumptions','control','influence','outside','next_action','review_at','result','actual_outcome','assumption_result','lesson']];
    state.decisions.forEach(x=>rows.push([x.title,x.category,statuses[x.status]||x.status,x.fact.join(' / '),x.assumptions.join(' / '),x.control.join(' / '),x.influence.join(' / '),x.outside.join(' / '),x.nextAction,x.reviewAt,resultLabels[x.review?.result]||'',x.review?.actualOutcome||'',assumptionLabels[x.review?.assumptionResult]||'',x.review?.lesson||'']));
    const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
    downloadFile(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`decision-os-${todayKey()}.csv`);
  };

  const originalExportJSON = window.exportJSON;
  window.exportJSON = function(){
    let stoic=null;
    try{ stoic=JSON.parse(localStorage.getItem(STOIC_KEY)); }catch(_){}
    const backup={format:'stoic30-decisionos-backup',version:1,exportedAt:new Date().toISOString(),stoic30:stoic,decisionOS:state};
    downloadFile(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`stoic30-decisionos-backup-${todayKey()}.json`);
  };

  const originalRestoreJSON = window.restoreJSON;
  window.restoreJSON = function(ev){
    const f=ev.target.files?.[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const incoming=JSON.parse(r.result);
        if(incoming?.format==='stoic30-decisionos-backup'){
          if(!confirm('匯入會取代目前瀏覽器的 Stoic 30 與 Decision OS 資料。確定繼續？'))return;
          if(incoming.stoic30) localStorage.setItem(STOIC_KEY,JSON.stringify(incoming.stoic30));
          state=normalizeState(incoming.decisionOS);persist();
          toast('完整備份已還原');setTimeout(()=>location.reload(),350);return;
        }
        if(typeof originalRestoreJSON==='function') return originalRestoreJSON(ev);
        alert('這個檔案不是有效的備份。');
      }catch(_){ alert('這個檔案不是有效的 JSON 備份。'); }
      finally{ ev.target.value=''; }
    };
    r.readAsText(f);
  };

  window.resetAll = function(){
    if(!confirm('確定永久刪除全部本機 Stoic 30 與 Decision OS 資料？這個動作無法復原。'))return;
    localStorage.removeItem(KEY);localStorage.removeItem('stoic30.v2');localStorage.removeItem('stoic30.v1');
    state=normalizeState(null);location.reload();
  };

  const originalRenderAll = window.renderAll;
  if (typeof originalRenderAll === 'function') {
    window.renderAll = function(){ originalRenderAll(); renderDecisionOS(); };
  }
  persist();
  renderDecisionOS();
})();
