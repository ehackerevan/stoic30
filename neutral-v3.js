// Stoic 30 V3 — 中性安全感與不確定性練習層
// 保留既有 stoic30.v2 localStorage，避免使用者更新後遺失舊紀錄。

const neutralQuotes = [
  '今天只處理你能控制的事。',
  '不確定，不代表事情正在變糟。',
  '不安不是行動指令。',
  '希望某個結果，不等於要求它必須發生。',
  '不要用單一事件預測整個未來。',
  '現在不知道答案，也可以。',
  '我可以在意結果，但不把平靜交給結果。',
  '先看事實，再看自己的解讀。',
  '我負責自己的行動，不負責控制所有變數。',
  '結果尚未出現之前，不預先承受結果。',
  '我可以失望，也有能力繼續處理生活。',
  '今天只對自己的選擇與回應負責。',
  '別人的評價是一項資訊，不是我的全部價值。',
  '我不需要先得到答案，才能繼續今天。',
  '一次失誤、拒絕或不順利，不等於我不夠好。',
  '讓時間回答暫時沒有答案的問題。',
  '不追著不安跑，先做下一件可控制的事。',
  '想確認，不等於現在必須確認。',
  '我可以承受事情不完全照預期發展。',
  '把注意力從結果移回下一個行動。',
  '允許未知存在，是安全感的一部分。',
  '一時的變化，不是最終判決。',
  '我可以期待，同時保留自己的節奏。',
  '不把猜測當成事實。',
  '沒有答案時，也能繼續過今天。',
  '停止預測，開始觀察。',
  '我的任務是準備與回應，不是控制所有結果。',
  '接受目前不知道，不等於放棄處理問題。',
  '我能控制的是回應，不是所有結果。',
  '安全感不是確定一切，而是知道自己能應對。'
];

try { quotes.splice(0, quotes.length, ...neutralQuotes); } catch (_) {}

const triggerCategories = [
  '工作／表現',
  '人際關係',
  '等待／不確定',
  '被評價／認可',
  '失誤／完美要求',
  '未來／規劃',
  '金錢／生活安排',
  '其他'
];

function categoryOptions(value) {
  return triggerCategories.map(x => `<option ${value===x?'selected':''}>${x}</option>`).join('');
}

function applyNeutralCopy() {
  document.title = 'Stoic 30｜我的安全感練習';
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = '個人用 30 天安全感與不確定性練習：控制二分法、不安介入、晚間回顧與恢復穩定趨勢。';
  const sub = document.querySelector('.brand small');
  if (sub) sub.textContent = '我的 30 天安全感與不確定性練習';

  const panicTitle = [...document.querySelectorAll('.taskTitle')].find(x => x.textContent.includes('患得患失'));
  if (panicTitle) {
    panicTitle.textContent = '我現在有點不安／患得患失';
    const metaEl = panicTitle.parentElement.querySelector('.taskMeta');
    if (metaEl) metaEl.textContent = '把事實、解讀、控制範圍與下一步重新分開';
  }

  const labelFor = (id, text) => {
    const el = document.getElementById(id);
    const k = el?.parentElement?.querySelector('.k');
    if (k) k.textContent = text;
  };
  labelFor('todayAnxiety','不安事件');
  labelFor('todayCheck','確認／反覆檢查');
  labelFor('weekAnxiety','不安次數');
  labelFor('weekCheck','確認／反覆檢查');

  const recoveryCard = document.getElementById('recoveryChart')?.closest('.card');
  if (recoveryCard) {
    const h2 = recoveryCard.querySelector('h2');
    const p = recoveryCard.querySelector('p');
    if (h2) h2.textContent = '恢復穩定所需時間';
    if (p) p.textContent = '越短通常代表你更能在不安出現後，回到原本要做的事情。';
  }

  const recordHeading = document.querySelector('#records .card h2');
  if (recordHeading) recordHeading.textContent = '不安／患得患失紀錄';

  const principleCard = document.querySelector('#principles .card');
  if (principleCard) {
    const h2 = principleCard.querySelector('h2');
    if (h2) h2.textContent = '我的安全感原則';
    const items = [
      ['控制二分法','我能控制自己的準備、選擇與回應；不能控制他人的反應、結果與未來。'],
      ['安全感','安全感不是確定所有事情，而是相信自己能面對變化與不如預期。'],
      ['不確定性','未知不等於危險；現在不知道答案，也可以。'],
      ['情緒','不安是一種感受與訊號，不是必須立刻行動的命令。'],
      ['事實與解讀','不把猜測當成事實，也不用單一事件預測全部結果。'],
      ['自我價值','一次結果、評價、拒絕或失誤，不是對我整體價值的評分。'],
      ['行動','先做好下一個可控制、對自己有幫助的行動，其餘交給時間與現實。']
    ];
    principleCard.querySelectorAll('.principle').forEach((el,i) => {
      if (items[i]) el.innerHTML = `<b>${items[i][0]}</b>${items[i][1]}`;
    });
  }

  const notice = document.querySelector('#settings .notice');
  if (notice) notice.textContent = '隱私：網站預設不把你的反思、不安事件或個人紀錄上傳到任何伺服器。資料留在目前瀏覽器的 localStorage。';

  [...document.querySelectorAll('button')].forEach(b => {
    if (b.textContent.trim()==='匯出焦慮 CSV') b.textContent='匯出事件 CSV';
  });

  document.querySelectorAll('.badge').forEach(b => {
    if (b.textContent.trim()==='仍去確認') b.textContent='確認／反覆檢查';
  });

  const trend = document.getElementById('trendMessage');
  if (trend) {
    trend.textContent = trend.textContent
      .replaceAll('焦慮','不安')
      .replaceAll('確認行為','確認／反覆檢查');
    if (trend.textContent.includes('資料累積後')) {
      trend.textContent = '資料累積後，這裡會優先看「恢復得更快」與「少被不安帶著走」，而不是要求不安歸零。';
    }
  }

  const eyebrow = document.getElementById('todayEyebrow');
  if (eyebrow) {
    const h = new Date().getHours();
    eyebrow.textContent = h<12 ? '早安・先把今天分成可控與不可控' : h>=18 ? '晚安・今天只檢視自己的應對' : '今日提醒・把注意力放回可控制的部分';
  }
}

const originalRenderAll = window.renderAll;
window.renderAll = function() {
  originalRenderAll();
  applyNeutralCopy();
};

window.openMorning = function() {
  const m=dayRecord().morning||{};
  openSheet('早晨練習','約 2–3 分鐘',`
    <label>今天有什麼事情讓我特別在意或不安？</label>
    <textarea id="mConcern" placeholder="例如：工作會不會出錯？別人會怎麼評價？事情是否會照計畫進行？">${esc(m.concern||'')}</textarea>
    <label>今天哪些是我能控制的？</label>
    <textarea id="mControl" placeholder="我的準備、態度、界線、工作節奏、如何回應，以及是否照顧好自己。">${esc(m.control||'')}</textarea>
    <label>哪些不是我能控制的？</label>
    <textarea id="mNoControl" placeholder="別人的反應、事情何時有答案、最終結果、已經發生的過去。">${esc(m.noControl||'')}</textarea>
    <label>如果今天事情不如預期，我相信自己仍能處理嗎？</label>
    <select id="mCapacity"><option ${m.capacity==='是'?'selected':''}>是</option><option ${m.capacity==='有點困難'?'selected':''}>有點困難</option><option ${m.capacity==='現在覺得很難'?'selected':''}>現在覺得很難</option></select>
    <div class="hint">今天只對「可控制」的部分負責；其餘先允許它保持未知。</div>
    <button class="btn block" onclick="saveMorning()">完成早晨練習</button>`);
};

window.openEvening = function() {
  const e=dayRecord().evening||{};
  openSheet('晚間回顧','約 5 分鐘',`
    <label>① 今天什麼事情讓我感到不安、患得患失或想立刻確認？</label>
    <textarea id="eTrigger">${esc(e.trigger||'')}</textarea>
    <label>② 我當時怎麼解讀？最擔心的是什麼？</label>
    <textarea id="eStory">${esc(e.story||'')}</textarea>
    <label>③ 我有沒有試圖控制不能控制的事情？</label>
    <select id="eControl"><option ${e.overControl==='有'?'selected':''}>有</option><option ${e.overControl==='沒有'?'selected':''}>沒有</option></select>
    <label>④ 今天我做對了什麼？</label>
    <textarea id="eRight" placeholder="例如：我有不安，但沒有一直檢查或尋求保證，而是先完成手邊的事情。">${esc(e.didRight||'')}</textarea>
    <div class="checkChoice"><label><input type="checkbox" id="eUnknown" ${e.unknown?'checked':''}> 今天有刻意留下一件「現在不知道答案也可以」的事情</label></div>
    <div class="hint">評分的是你的應對方式，不是事情有沒有照預期發展。</div>
    <button class="btn block" onclick="saveEvening()">完成晚間回顧</button>`);
};

window.panic1 = function() {
  openSheet('到底發生了什麼？','1 / 5 · 先辨識觸發，再寫客觀事實',`
    <p class="muted">先拿掉「是不是要變糟了」「是不是我不夠好」這類推論，只記錄客觀事件。</p>
    <label>這次不安比較接近哪一類？</label>
    <select id="pCategory">${categoryOptions(panic.category||'')}</select>
    <label>客觀事實</label>
    <textarea id="pFact" placeholder="例如：主管還沒回覆訊息；我今天出現一個工作失誤；事情比預定時間晚。">${esc(panic.fact||'')}</textarea>
    <button class="btn block" onclick="panic.category=pCategory.value;panic.fact=pFact.value.trim();syncPanic();panic2()">下一步</button>`);
};

window.panic2 = function() {
  openSheet('我的大腦怎麼解讀？','2 / 5 · 把故事與事實拆開',`
    <label>我現在腦中出現什麼故事？</label>
    <textarea id="pStory" placeholder="例如：是不是代表我做得很差？事情是不是要變糟？別人是不是對我失望？">${esc(panic.story||'')}</textarea>
    <button class="btn block" onclick="panic.story=pStory.value.trim();syncPanic();panic3()">下一步</button>`);
};

window.panic4 = function() {
  openSheet('先不要立刻確認','4 / 5 · 不安不是行動指令',`
    <div class="hint">${panic.control==='不可控制'?'這不是你現在必須解決的問題。允許答案暫時不存在。':'把焦點放在下一個真正可控制的行動，而不是用確認消除不安。'}</div>
    <label>我現在最想用什麼方式換取確定感？</label>
    <div class="checkChoice">${['重看訊息／資料','一直刷新或查看狀態','立刻傳訊息或打電話確認','問別人尋求保證','上網搜尋更多答案','反覆在腦中分析','占卜／反覆尋求另一個答案'].map(x=>`<label><input type="checkbox" name="urge" value="${x}" ${panic.urges?.includes(x)?'checked':''}> ${x}</label>`).join('')}</div>
    <label>先延後多久？</label>
    <div class="grid2"><button class="btn secondary" onclick="beginDelay(10)">10 分鐘</button><button class="btn secondary" onclick="beginDelay(30)">30 分鐘</button></div>
    <div style="height:8px"></div><button class="btn ghost block" onclick="beginDelay(1440)">延後到明天</button>
    <div style="height:8px"></div><button class="btn warm block" onclick="markChecked()">我仍決定現在去確認／檢查</button>`);
};

window.showDelay = function() {
  const until=panic.delayUntil||Date.now();
  openSheet('把確認延後','4 / 5 · 讓不確定性先待著',`
    <p class="muted">你不需要先把不安完全消除，才可以繼續做下一件事。</p>
    <div class="timer" id="timer">--:--</div><div class="timerSub" id="timerSub"></div>
    <div style="height:12px"></div><button class="btn block" onclick="finishOutcome('delayed')">我成功沒有立刻確認</button>
    <div style="height:8px"></div><button class="btn warm block" onclick="markChecked()">我最後還是去確認／檢查了</button>`);
  function tick(){
    const ms=until-Date.now(),sec=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(sec/60),s=sec%60;
    const te=document.getElementById('timer');if(te)te.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const sub=document.getElementById('timerSub');if(sub)sub.textContent=ms<=0?'設定的延遲時間已經到了。你已經證明自己可以先不行動。':'倒數只是輔助，不需要一直盯著它。';
    if(ms<=0&&timerHandle){clearInterval(timerHandle);timerHandle=null}
  }
  tick();timerHandle=setInterval(tick,1000);
};

window.panic5 = function() {
  openSheet('回到現在','5 / 5 · 選一個可控制的行動',`
    <label>接下來我要做什麼？</label>
    <select id="pNext"><option>回去工作</option><option>處理下一件小事</option><option>暫時離開手機走動</option><option>去運動</option><option>吃飯／喝水</option><option>洗澡／整理環境</option><option>閱讀／休息</option><option>找可信任的人正常聊天</option><option>照原本計畫處理事情</option><option>其他</option></select>
    <label>從不安出現到「可以回到原本生活／工作」，大約用了幾分鐘？</label>
    <input id="pRecovery" type="number" min="0" max="600" inputmode="numeric" placeholder="例如：20">
    <div class="hint">不需要等到完全沒有不安，只要已經能回到原本要做的事情，就算「恢復」。</div>
    <button class="btn block" onclick="finishPanic()">完成這次練習</button>`);
};

window.renderRecords = function() {
  const a=document.getElementById('anxietyList'),xs=[...validEvents()].sort((x,y)=>(y.startedAt||y.id)-(x.startedAt||x.id));
  if(!xs.length)a.innerHTML='<p>尚無紀錄。</p>';
  else a.innerHTML=xs.map(x=>`<div class="record"><div class="row between"><div><div class="recordTitle">${x.date} · ${esc((x.fact||'尚未填寫').slice(0,36))}</div><div class="muted" style="font-size:11px;margin-top:2px">${esc(x.category||'未分類')}</div></div><span class="badge ${x.status==='done'?'':x.status==='delay'?'warm':'gray'}">${x.status==='done'?(x.outcome==='delayed'?'成功延遲':'確認／反覆檢查'):x.status==='delay'?'延遲中':'未完成'}</span></div><div class="muted" style="font-size:12px;margin:4px 0">${x.story?`解讀：${esc(x.story.slice(0,55))}`:'尚無解讀'}${Number.isFinite(Number(x.recovery))?` · 恢復 ${x.recovery} 分鐘`:''}</div><div class="row"><button class="btn ghost small" onclick="editAnxiety(${x.id})">查看 / 修改</button><button class="btn danger small" onclick="deleteAnxiety(${x.id})">刪除</button></div></div>`).join('');
  const d=document.getElementById('dailyList'),keys=Object.keys(data.days).filter(k=>data.days[k].morning||data.days[k].evening).sort().reverse();
  if(!keys.length)d.innerHTML='<p>尚無紀錄。</p>';
  else d.innerHTML=keys.map(k=>`<div class="record"><div class="row between"><div class="recordTitle">${k}</div><span class="badge ${completedDay(k)?'':'gray'}">${completedDay(k)?'完整':'部分'}</span></div><div class="muted" style="font-size:12px;margin-top:4px">早晨 ${data.days[k].morning?'✓':'—'} · 晚間 ${data.days[k].evening?'✓':'—'}</div></div>`).join('');
};

window.editAnxiety = function(id) {
  const x=data.anxiety.find(x=>x.id===id);if(!x)return;
  openSheet('查看 / 修改紀錄',x.date,`
    <label>觸發類型</label><select id="edCategory">${categoryOptions(x.category||'其他')}</select>
    <label>客觀事實</label><textarea id="edFact">${esc(x.fact||'')}</textarea>
    <label>我的解讀</label><textarea id="edStory">${esc(x.story||'')}</textarea>
    <label>控制範圍</label><select id="edControl"><option ${x.control==='可控制'?'selected':''}>可控制</option><option ${x.control==='不可控制'?'selected':''}>不可控制</option></select>
    <label>結果</label><select id="edOutcome"><option value="" ${!x.outcome?'selected':''}>未完成</option><option value="delayed" ${x.outcome==='delayed'?'selected':''}>成功延遲</option><option value="checked" ${x.outcome==='checked'?'selected':''}>確認／反覆檢查</option></select>
    <label>恢復分鐘</label><input type="number" id="edRecovery" min="0" value="${x.recovery??''}">
    <label>下一個可控制行動</label><input type="text" id="edNext" value="${esc(x.nextAction||'')}">
    <button class="btn block" onclick="saveAnxietyEdit(${id})">儲存修改</button>`);
};

window.saveAnxietyEdit = function(id) {
  const x=data.anxiety.find(x=>x.id===id);
  x.category=edCategory.value;x.fact=edFact.value.trim();x.story=edStory.value.trim();x.control=edControl.value;x.outcome=edOutcome.value||null;x.recovery=edRecovery.value===''?null:Number(edRecovery.value);x.nextAction=edNext.value.trim();x.status=x.outcome?'done':'draft';
  save();closeSheet();toast('紀錄已更新');
};

window.deleteAnxiety = function(id) {
  if(!confirm('刪除這筆不安事件紀錄？'))return;
  data.anxiety=data.anxiety.filter(x=>x.id!==id);save();toast('紀錄已刪除');
};

window.exportCSV = function() {
  const rows=[['date','category','fact','story','control','outcome','urges','delay_minutes','recovery_minutes','next_action']];
  doneEvents().forEach(x=>rows.push([x.date,x.category||'',x.fact||'',x.story||'',x.control||'',x.outcome||'',(x.urges||[]).join(' / '),x.delayMinutes||'',x.recovery??'',x.nextAction||'']));
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
  download(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`stoic30-events-${todayKey()}.csv`);
};

// 原始 V2 已先 render 一次；覆寫完成後再 render，套用新的中性文案與流程。
renderAll();
applyNeutralCopy();
