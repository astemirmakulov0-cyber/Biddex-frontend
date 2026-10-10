// Run: node test/poll.test.js   (no dependencies)
// Checks the polling schedule of index.html: it takes the code between the poll-plan markers and runs it.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /\/\* poll-plan:start \*\/([\s\S]*?)\/\* poll-plan:end \*\//.exec(html);
if (!m) { console.error('FAIL poll-plan block not found in index.html'); process.exit(1); }
const { POLL_VISIBLE_MS, POLL_HIDDEN_MS, pollDue, returnAction, quietRefreshDue, newUnreadNotifications } = new Function(m[1] + '; return { POLL_VISIBLE_MS, POLL_HIDDEN_MS, pollDue, returnAction, quietRefreshDue, newUnreadNotifications };')();

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const T0 = 1_000_000;
const s = (sec) => T0 + sec * 1000;

check('visible tab: not due right after a poll', pollDue(s(5), T0, false) === false);
check('visible tab: due on the 30 s tick (timer jitter of up to 1 s tolerated)', pollDue(s(30), T0, false) === true && pollDue(s(29.5), T0, false) === true);
check('hidden tab: not due after 30 s, 60 s, 4 minutes', [30, 60, 240].every((x) => pollDue(s(x), T0, true) === false));
check('hidden tab: due after 5 minutes', pollDue(s(300), T0, true) === true);
// a hidden tab ticking every 30 s polls once per 5 minutes: 10 ticks of 30 s -> 1 poll
let last = T0, polls = 0; for (let i = 1; i <= 20; i++) { const now = s(i * 30); if (pollDue(now, last, true)) { polls++; last = now; } }
check('hidden for 10 minutes (20 ticks): 2 polls instead of 20', polls === 2);
last = T0; polls = 0; for (let i = 1; i <= 20; i++) { const now = s(i * 30); if (pollDue(now, last, false)) { polls++; last = now; } }
check('visible for 10 minutes: a poll on every tick (20)', polls === 20);

check('coming back within 30 s: nothing to do', returnAction(s(10), T0) === 'none');
check('coming back after 30 s .. 5 min: light poll at once', returnAction(s(30), T0) === 'poll' && returnAction(s(299), T0) === 'poll');
check('coming back after 5 minutes or more: full refresh', returnAction(s(300), T0) === 'full' && returnAction(s(3600), T0) === 'full');
check('intervals: 30 s visible, 5 minutes hidden', POLL_VISIBLE_MS === 30000 && POLL_HIDDEN_MS === 300000);

// the wiring in index.html: the timer asks pollDue with document.hidden, the return handler uses returnAction, refreshAll stamps the time
check('wiring: the interval checks pollDue(..., document.hidden)', /pollDue\(Date\.now\(\), lastPollAt, document\.hidden\)/.test(html));
check('wiring: the visibilitychange handler uses returnAction and no longer refreshes everything every time', /returnAction\(Date\.now\(\), lastPollAt\)/.test(html) && !/if \(document\.hidden \|\| !state\.token\) return;\n  if \(state\.view === 'buyer' \|\| state\.view === 'supplier'\) refreshAll\(\);/.test(html));
check('wiring: lastPollAt is declared before the first refreshAll() call', html.indexOf('let lastPollAt') < html.indexOf("if (state.token) { if (state.view === 'admin') refreshAdmin(); else refreshAll(); }"));


// a quiet refresh after a new notification and on returning to the app
check('quiet refresh: not within 30 s of the last one, allowed from 30 s', !quietRefreshDue(T0 + 29999, T0) && quietRefreshDue(T0 + 30000, T0) && quietRefreshDue(T0 + 90000, T0));
const seen = new Set(['a', 'b']);
const list = [{ id: 'a', read: false }, { id: 'b', read: true }, { id: 'c', read: false }, { id: 'd', read: true }];
check('only an unread notification not seen before is new (the first answer of a session, with nothing seen, has none)', JSON.stringify(newUnreadNotifications(seen, list).map((n) => n.id)) === '["c"]' && newUnreadNotifications(null, list).length === 0 && newUnreadNotifications(seen, [{ id: 'a', read: false }]).length === 0);
const has = (s) => html.includes(s);
check('wiring: a new notification calls quietRefresh, throttled by quietRefreshDue', has('const fresh = newUnreadNotifications(notifSeen, data);') && has('if (fresh.length && quietRefreshDue(Date.now(), lastQuietAt)) quietRefresh();'));
check('wiring: the quiet refresh covers company, wallet, lists and the open order', has('refreshCompanyInfo(); refreshWallet(); refreshRfqs(); refreshOrders(); refreshLpos(); refreshOrderDetailQuiet();'));
const poll = html.slice(html.indexOf('function pollNow(){'), html.indexOf('setInterval(() => {\n  if (!state.token) return;'));
check('wiring: a poll covers company, wallet and the open order too', poll.includes('refreshCompanyInfo();') && poll.includes('refreshWallet();') && poll.includes('refreshOrderDetailQuiet();'));
check('wiring: visibilitychange and focus both use onReturnToApp (throttled by returnAction)', has("document.addEventListener('visibilitychange', onReturnToApp);") && has("window.addEventListener('focus', onReturnToApp);"));
check('wiring: signing out forgets the seen notifications', has('function logout(){\n  notifSeen = null;'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
