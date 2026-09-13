import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../decision-os-v3.js', import.meta.url), 'utf8');

function createEnv(initial = {}) {
  const store = new Map(Object.entries(initial));
  const elements = new Map();
  const alerts = [];
  let baseSaveCalls = 0;
  let confirmValue = false;

  function element(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(), id: '', className: '', textContent: '', value: '', style: {}, dataset: {}, nextSibling: null,
      classList: { toggle() {}, add() {}, remove() {} }, parentNode: { insertBefore() {} },
      appendChild() {}, remove() {}, click() {}, focus() {}, addEventListener() {}, insertAdjacentElement() {},
      querySelector(sel) { return sel === '#dProjectStage' ? el._select || null : null; }
    };
    Object.defineProperty(el, 'innerHTML', {
      get() { return this._html || ''; },
      set(v) { this._html = v; if (v.includes('id="dProjectStage"')) this._select = { value: 'backlog' }; }
    });
    return el;
  }

  const localStorage = {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); }
  };
  const document = { head: { appendChild() {} }, body: { appendChild() {} }, createElement: element, getElementById(id) { return elements.get(id) || null; } };
  const window = {
    openDecisionEditor() {},
    saveDecisionEditor() {
      baseSaveCalls++;
      const raw = JSON.parse(localStorage.getItem('decisionos.v1') || '{"version":2,"decisions":[]}');
      raw.decisions ||= [];
      raw.decisions.push({ id: 100 + baseSaveCalls, title: 'new', category: elements.get('dCategory')?.value || '其他', status: 'action' });
      localStorage.setItem('decisionos.v1', JSON.stringify(raw));
    },
    deleteDecision() {}, reopenDecision() {}, keepDecisionOpen() {}, saveDecisionReview() {},
    resetAll() { if (!confirmValue) return; localStorage.removeItem('decisionos.v1'); localStorage.removeItem('stoic30.v2'); },
    restoreJSON() {}, exportJSON() {}
  };

  const context = {
    window, document, localStorage, alert: m => alerts.push(String(m)), confirm: () => confirmValue,
    toast() {}, openSheet() {}, closeSheet() {}, FileReader: class {}, Blob: class {},
    URL: { createObjectURL: () => '', revokeObjectURL() {} }, location: { reload() {} }, setTimeout() {},
    Date, Math, JSON, String, Number, Array, Object, console
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, store, elements, alerts, element, get baseSaveCalls() { return baseSaveCalls; }, setConfirm(v) { confirmValue = v; } };
}

const decisionState = items => JSON.stringify({ version: 2, decisions: items });
const extState = (inbox = [], stages = {}) => JSON.stringify({ version: 1, inbox, projectStages: stages, settings: { activeProjectLimit: 2 } });

{
  const e = createEnv({ 'decisionos.v1': decisionState([]) });
  const input = e.element('input'); input.value = '  新想法  '; e.elements.set('universalInboxInput', input);
  e.context.window.addUniversalInboxItem();
  const saved = JSON.parse(e.store.get('decisionos.v3'));
  assert.equal(saved.inbox.length, 1); assert.equal(saved.inbox[0].text, '新想法'); assert.equal(input.value, '');
}

{
  const ds = [{ id: 1, category: '專案', status: 'action' }, { id: 2, category: '專案', status: 'waiting' }];
  const e = createEnv({ 'decisionos.v1': decisionState(ds), 'decisionos.v3': extState([], { 1: 'active', 2: 'active' }) });
  const cat = e.element('select'); cat.value = '專案'; const stage = e.element('select'); stage.value = 'active';
  e.elements.set('dCategory', cat); e.elements.set('dProjectStage', stage);
  e.context.window.saveDecisionEditor(null);
  assert.equal(e.baseSaveCalls, 0); assert.match(e.alerts.at(-1), /2 個上限/);
}

{
  const ds = [{ id: 1, category: '專案', status: 'action' }, { id: 2, category: '專案', status: 'waiting' }];
  const e = createEnv({ 'decisionos.v1': decisionState(ds), 'decisionos.v3': extState([], { 1: 'active', 2: 'active' }) });
  const cat = e.element('select'); cat.value = '專案'; const stage = e.element('select'); stage.value = 'backlog';
  e.elements.set('dCategory', cat); e.elements.set('dProjectStage', stage);
  e.context.window.saveDecisionEditor(null);
  assert.equal(e.baseSaveCalls, 1); assert.equal(JSON.parse(e.store.get('decisionos.v3')).projectStages['101'], 'backlog');
}

{
  const ds = [{ id: 1, category: '專案', status: 'closed' }, { id: 2, category: '專案', status: 'action' }];
  const e = createEnv({ 'decisionos.v1': decisionState(ds), 'decisionos.v3': extState([], { 1: 'active', 2: 'active' }) });
  const cat = e.element('select'); cat.value = '專案'; const stage = e.element('select'); stage.value = 'active';
  e.elements.set('dCategory', cat); e.elements.set('dProjectStage', stage);
  e.context.window.saveDecisionEditor(null);
  assert.equal(e.baseSaveCalls, 1); assert.equal(e.alerts.length, 0);
}

{
  const initial = { 'decisionos.v1': decisionState([{ id: 1, category: '專案', status: 'action' }]), 'decisionos.v3': extState([{ id: 9, text: 'keep', createdAt: 1 }], { 1: 'active' }) };
  const e = createEnv(initial);
  e.setConfirm(false); e.context.window.resetAll(); assert.ok(e.store.has('decisionos.v3'));
  e.setConfirm(true); e.context.window.resetAll(); assert.ok(!e.store.has('decisionos.v3'));
}

console.log('Decision OS V3 smoke tests passed');
