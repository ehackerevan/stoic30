// Decision OS V1 — local-first decision and uncertainty management
// Uses a separate storage key so existing Stoic 30 data remains untouched.

(() => {
  const KEY = 'decisionos.v1';
  const statuses = {
    action: '需要行動',
    waiting: '等待中',
    review: '待回顧',
    closed: '已完成'
  };

  function todayKey(){ return new Date().toLocaleDateString('sv-SE'); }
  function esc(s=''){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function load(){
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.decisions)) return d;
    } catch (_) {}
    return {version:1, decisions:[]};
  }
  let state = load();
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); renderDecisionOS(); }

  function byId(id){ return state.decisions.find(x => x.id === id); }
  function active(){ return state.decisions.filter(x => x.status !== 'closed'); }
  function dueToday(x){ return x.reviewAt && x.reviewAt <= todayKey() && x.status !== 'closed'; }
  function badgeClass(status){ return status === 'waiting' ? 'warm' : status === 'closed' ? 'gray' : ''; }
  function splitLines(v){ return String(v||'').split('\n').map(x=>x.trim()).filter(Boolean); }
  function lines(v){ return (v||[]).join('\n'); }

  function injectStyles(){
    if (document.getElementById('decisionOsStyle')) return;
    const s = document.createElement('style');
    s.id = 'decisionOsStyle';
    s.textContent = `
      .decision-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
      .decision-list{display:grid;gap:10px;margin-top:12px}
      .decision-item{border:1px solid var(--line);background:white;border-radius:15px;padding:13px}
      .decision-item h3{margin:0 0 5px;font-size:15px}
      .decision-meta{font-size:11px;color:var(--muted);margin-top:4px}
      .decision-next{margin-top:8px;padding:9px 10px;border-radius:11px;background:var(--surface2);font-size:12px}
      .decision-columns{display:grid;grid-template-columns:1fr;gap:9px}
      .decision-box{border:1px solid var(--line);border-radius:13px;padding:11px;background:white}
      .decision-box b{display:block;font-size:12px;margin-bottom:4px}
      @media(min-width:640px){.decision-columns{grid-template-columns:1fr 1fr 1fr}}
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
      <div style="height:10px"></div><button class="btn ghost block" onclick="go('principles')">查看全部決策</button>
    `;
    const hero = today.querySelector('.hero');
    hero?.insertAdjacentElement('afterend', card);
  }

  function convertPrinciplesScreen(){
    const screen = document.getElementById('principles');
    if (!screen || screen.dataset.decisionOs === '1') return;
    screen.dataset.decisionOs = '1';
    screen.innerHTML = `
      <div class="card">
        <div class="row between"><div><div class="eyebrow">Decision OS</div><h2>決策與不確定性</h2></div><button class="btn primary small" onclick="openDecisionEditor()">＋ 新事件</button></div>
        <p>把模糊的反覆思考拆成事實、推測、控制範圍與下一步。沒有新資訊時，不必一直重做同一個決定。</p>
        <div class="decision-summary">
          <div class="mini"><div class="n" id="allDecisionActionCount">0</div><div class="k">需要行動</div></div>
          <div class="mini"><div class="n" id="allDecisionWaitingCount">0</div><div class="k">等待中</div></div>
          <div class="mini"><div class="n" id="allDecisionClosedCount">0</div><div class="k">已完成</div></div>
        </div>
      </div>
      <div class="card"><div class="row between"><h2>進行中的事情</h2><span class="badge" id="decisionOpenBadge">0 件</span></div><div id="decisionOpenList" class="decision-list"></div></div>
      <div class="card"><h2>已完成</h2><div id="decisionClosedList" class="decision-list"></div></div>
    `;
    const navBtn = document.querySelector('.nav button[data-screen="principles"]');
    if (navBtn) navBtn.innerHTML = '<span>◇</span>決策';
  }

  function decisionCard(x, compact=false){
    const review = x.reviewAt ? ` · Review ${esc(x.reviewAt)}` : '';
    const next = x.nextAction ? `<div class="decision-next"><b>下一步：</b>${esc(x.nextAction)}</div>` : '';
    return `<div class="decision-item">
      <div class="row between"><h3>${esc(x.title || '未命名事件')}</h3><span class="badge ${badgeClass(x.status)}">${statuses[x.status]||x.status}</span></div>
      <div class="decision-meta">${esc(x.category||'其他')}${review}</div>
      ${compact ? '' : `<div class="muted" style="font-size:12px;margin-top:7px">${x.fact?.[0] ? `事實：${esc(x.fact[0])}` : '尚未填寫事實'}</div>`}
      ${next}
      <div class="row" style="margin-top:9px"><button class="btn ghost small" onclick="openDecisionEditor(${x.id})">查看 / 修改</button>${x.status !== 'closed' ? `<button class="btn secondary small" onclick="closeDecision(${x.id})">標記完成</button>` : ''}</div>
    </div>`;
  }

  function renderDecisionOS(){
    injectStyles(); injectHomeCard(); convertPrinciplesScreen();
    const xs = [...state.decisions].sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt));
    const action = xs.filter(x=>x.status==='action');
    const waiting = xs.filter(x=>x.status==='waiting');
    const review = xs.filter(dueToday);
    const closed = xs.filter(x=>x.status==='closed');

    const setText = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    setText('decisionActionCount', action.length); setText('decisionWaitingCount', waiting.length); setText('decisionReviewCount', review.length);
    setText('allDecisionActionCount', action.length); setText('allDecisionWaitingCount', waiting.length); setText('allDecisionClosedCount', closed.length);
    setText('decisionOpenBadge', active().length+' 件');

    const home = document.getElementById('decisionTodayList');
    if (home) {
      const focus = [...review, ...action.filter(x=>!review.includes(x))].slice(0,3);
      home.innerHTML = focus.length ? focus.map(x=>decisionCard(x,true)).join('') : '<p>目前沒有需要立即重新處理的決策。等待中的事情可以留在等待中。</p>';
    }
    const openList = document.getElementById('decisionOpenList');
    if(openList) openList.innerHTML = active().length ? active().map(x=>decisionCard(x)).join('') : '<p>目前沒有進行中的事件。</p>';
    const closedList = document.getElementById('decisionClosedList');
    if(closedList) closedList.innerHTML = closed.length ? closed.slice(0,20).map(x=>decisionCard(x)).join('') : '<p>尚無已完成紀錄。</p>';
  }

  window.openDecisionEditor = function(id){
    const x = id ? byId(id) : {id:null,title:'',category:'工作',status:'action',fact:[],assumptions:[],control:[],influence:[],outside:[],nextAction:'',reviewAt:'',outcome:''};
    openSheet(id ? '查看 / 修改決策' : '新增事件','Decision OS · Fact → Control → Action',`
      <label>這件事情是什麼？</label>
      <input id="dTitle" type="text" value="${esc(x.title||'')}" placeholder="例如：要不要主動詢問專案進度？">
      <label>分類</label>
      <select id="dCategory">${['工作','人際','金錢','購物','學習','健康生活','旅行','專案','其他'].map(v=>`<option ${x.category===v?'selected':''}>${v}</option>`).join('')}</select>
      <label>目前狀態</label>
      <select id="dStatus"><option value="action" ${x.status==='action'?'selected':''}>需要行動</option><option value="waiting" ${x.status==='waiting'?'selected':''}>等待中</option><option value="review" ${x.status==='review'?'selected':''}>待回顧</option><option value="closed" ${x.status==='closed'?'selected':''}>已完成</option></select>
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
      <div class="hint">如果現在沒有新資訊，可以把狀態設為「等待中」，並指定 Review 日期。在那之前不需要一直重做同一個決定。</div>
      <label>結果 / 回顧（可之後再填）</label><textarea id="dOutcome" placeholder="最後實際發生什麼？原本的推測有被證實嗎？">${esc(x.outcome||'')}</textarea>
      <button class="btn block" onclick="saveDecisionEditor(${id||'null'})">儲存</button>
      ${id ? `<div style="height:8px"></div><button class="btn danger block" onclick="deleteDecision(${id})">刪除此事件</button>` : ''}
    `);
  };

  window.saveDecisionEditor = function(id){
    const now = Date.now();
    const current = id ? byId(id) : {id:now, createdAt:now};
    Object.assign(current, {
      title:dTitle.value.trim(), category:dCategory.value, status:dStatus.value,
      fact:splitLines(dFacts.value), assumptions:splitLines(dAssumptions.value),
      control:splitLines(dControl.value), influence:splitLines(dInfluence.value), outside:splitLines(dOutside.value),
      nextAction:dNext.value.trim(), reviewAt:dReview.value, outcome:dOutcome.value.trim(), updatedAt:now
    });
    if(!id) state.decisions.push(current);
    save(); closeSheet(); toast(id ? '決策已更新' : '事件已加入 Decision OS');
  };

  window.closeDecision = function(id){
    const x=byId(id); if(!x)return;
    x.status='closed'; x.updatedAt=Date.now(); save(); toast('已標記完成，可在之後回顧結果');
  };

  window.deleteDecision = function(id){
    if(!confirm('刪除這筆 Decision OS 紀錄？')) return;
    state.decisions=state.decisions.filter(x=>x.id!==id); save(); closeSheet(); toast('紀錄已刪除');
  };

  const originalRenderAll = window.renderAll;
  if (typeof originalRenderAll === 'function') {
    window.renderAll = function(){ originalRenderAll(); renderDecisionOS(); };
  }
  renderDecisionOS();
})();
