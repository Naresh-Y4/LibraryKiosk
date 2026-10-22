'use strict';
/* All integrations (face verification, scanner, library backend) are SIMULATED. */
const CONFIG = { verifyMs: 2000, resetMs: 4000, issueMs: 600 };
const USER = { id: '24MIS0317', name: 'Naresh Y' };
const FIXTURES = {
  eligible:   { itemNo: '138998', title: 'User Interface Book',          loanable: true },
  restricted: { itemNo: '138998', title: 'SCIENCE AND TECH SECRET BOOK', loanable: false }
};
const DUE_DATE = '14/10/2026';           // fixed reference fixture
const REF_FAILURE_TITLE = 'User Interface Book'; // title shown in the failure screenshot (differs from scanned screenshot)

const state = { screen: 'welcome', user: null, scenario: 'eligible', referenceMode: false, book: null, busy: false, result: null };
let timers = [], navToken = 0, focusPending = false;
const $ = id => document.getElementById(id);

/* ---- timers: every timer belongs to the current navigation token ---- */
function later(fn, ms) {
  const token = navToken;
  const t = setTimeout(() => { if (token === navToken) fn(); }, ms);
  timers.push(t);
}
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

/* ---- navigation ---- */
function go(screen) {
  clearTimers(); navToken++;
  state.screen = screen; state.busy = false; focusPending = true;
  render();
  if (screen === 'identity') startVerification();
  if (screen === 'thanks') later(resetSession, CONFIG.resetMs);
}
function startVerification() {
  later(() => {
    state.user = USER;
    go('place');
    announce('Identity verified. Please place your book.');
  }, CONFIG.verifyMs);
}
function resetSession() {
  clearTimers(); navToken++;
  Object.assign(state, { screen: 'welcome', user: null, book: null, busy: false, result: null });
  focusPending = true; render();
}

/* ---- actions ---- */
function simulateScan() {
  if (state.screen !== 'place' || state.book || state.busy) return;
  state.book = { ...FIXTURES[state.scenario] };
  render(); announce('Scanned 1 book: ' + state.book.title);
}
function confirmIssue() {
  if (state.screen !== 'place' || !state.book || state.busy) return;
  state.busy = true; render();
  later(() => {
    const b = state.book, ok = b.loanable;
    state.result = {
      itemNo: b.itemNo, ok,
      title: !ok && state.referenceMode ? REF_FAILURE_TITLE : b.title,
      due: DUE_DATE, label: ok ? 'Success' : 'FAILURE', remarks: ok ? '-' : 'Not for Loan'
    };
    go('result');
    announce(ok ? 'Book issued successfully.' : 'Book issue failed. Not for loan.');
  }, CONFIG.issueMs);
}
function backFromPlace() {
  if (state.busy) return;
  if (state.book) { state.book = null; render(); announce('Scanned 0 books'); focusPending = true; render(); }
  else { state.user = null; state.book = null; go('identity'); }
}

/* ---- rendering ---- */
function cell(tag, text) { const c = document.createElement(tag); c.textContent = text; return c; }
function render() {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.dataset.screen !== state.screen; });
  $('who').hidden = !(state.user && (state.screen === 'place' || state.screen === 'result'));
  $('whoId').textContent = state.user ? state.user.id + '-' + state.user.name : '';
  const welcomeShown = state.screen !== 'thanks' && !state.user;
  $('who').hidden = state.screen === 'thanks' ? true : false;
  $('who').firstElementChild.textContent = 'WELCOME';
  if (welcomeShown) { $('who').hidden = false; }
  $('whoId').hidden = !state.user;

  const body = $('scan-body'); body.replaceChildren();
  if (state.book) {
    const tr = document.createElement('tr');
    tr.append(cell('td', '1'), cell('td', state.book.itemNo), cell('td', state.book.title));
    body.append(tr);
  }
  $('counter').textContent = 'Scanned:' + (state.book ? 1 : 0);
  $('btn-confirm').hidden = !state.book;
  $('btn-confirm').disabled = state.busy;
  $('btn-back-place').disabled = state.busy;
  $('btn-scan').disabled = !!state.book || state.busy;

  const rb = $('res-body'); rb.replaceChildren();
  const r = state.result;
  if (r) {
    const tr = document.createElement('tr'); tr.className = r.ok ? 'row-ok' : 'row-fail';
    tr.append(cell('td', '1'), cell('td', r.itemNo), cell('td', r.title), cell('td', r.due), cell('td', r.label), cell('td', r.remarks));
    rb.append(tr);
  }
  $('bigx').hidden = !(r && !r.ok);

  if (focusPending) {
    focusPending = false;
    const h = document.querySelector('#s-' + state.screen + ' h1'); if (h) h.focus({ preventScroll: true });
  }
}
function announce(msg) { const l = $('live'); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 50); }

/* ---- scaling for the 1440x900 canvas ---- */
function fit() {
  const vp = $('viewport'), st = $('stage');
  if (window.matchMedia('(max-width:899px)').matches) { st.style.transform = ''; st.style.left = ''; return; }
  const s = Math.min(vp.clientWidth / 1440, vp.clientHeight / 900);
  st.style.transform = 'scale(' + s + ')';
  st.style.left = Math.max(0, (vp.clientWidth - 1440 * s) / 2) + 'px';
}

/* ---- init ---- */
document.querySelectorAll('.art img').forEach(img => {
  const miss = () => img.closest('.art').classList.add('missing');
  img.addEventListener('error', miss); if (img.complete && img.naturalWidth === 0) miss();
});
$('btn-issue').addEventListener('click', () => go('identity'));
$('btn-back-id').addEventListener('click', () => go('welcome'));
$('btn-back-place').addEventListener('click', backFromPlace);
$('btn-scan').addEventListener('click', simulateScan);
$('btn-confirm').addEventListener('click', confirmIssue);
$('btn-exit').addEventListener('click', () => go('thanks'));
if (new URLSearchParams(location.search).get('demo') === '1') {
  $('demo').hidden = false;
  document.querySelectorAll('input[name=sc]').forEach(i => i.addEventListener('change', () => { state.scenario = i.value; }));
  $('d-ref').addEventListener('change', e => { state.referenceMode = e.target.checked; });
  $('d-scan').addEventListener('click', simulateScan);
  $('d-reset').addEventListener('click', resetSession);
}
window.addEventListener('resize', fit);
render(); fit();
new ResizeObserver(fit).observe($('viewport'));