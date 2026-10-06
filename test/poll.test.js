// Run: node test/poll.test.js   (no dependencies)
// Checks the polling schedule of index.html: it takes the code between the poll-plan markers and runs it.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /\/\* poll-plan:start \*\/([\s\S]*?)\/\* poll-plan:end \*\//.exec(html);
if (!m) { console.error('FAIL poll-plan block not found in index.html'); process.exit(1); }
const { POLL_VISIBLE_MS, POLL_HIDDEN_MS, pollDue, returnAction } = new Function(m[1] + '; return { POLL_VISIBLE_MS, POLL_HIDDEN_MS, pollDue, returnAction };')();

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
