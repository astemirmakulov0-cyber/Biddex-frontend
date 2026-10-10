// Run: node test/accept-invite.test.js   (no dependencies)
// The invitation page: the token leaves the address at once, goes only in the Authorization header, both languages are complete.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'accept-invite.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };

check('the token is read from #t= and the fragment is removed before anything else loads', html.indexOf('history.replaceState') > 0 && html.indexOf('history.replaceState') < html.indexOf('<style>') && /\{43\}/.test(html));
check('it goes only in the Authorization header (Invite <token>), never in a URL', /Authorization: 'Invite ' \+ INVITE_TOKEN/.test(html) && !/[?&]t=' *\+/.test(html) && !/API_URL \+ [^,]*INVITE_TOKEN/.test(html));
check('no referrer, not indexed', /name="referrer" content="no-referrer"/.test(html) && /name="robots" content="noindex/.test(html));
check('it talks to the two public routes', /'\/public\/invite'/.test(html) && /'\/public\/invite\/accept'/.test(html));
check('consent is required and sent as true, the name and password are checked before sending', /consent: true/.test(html) && /nameRequired/.test(html) && /passwordShort/.test(html) && /consentRequired/.test(html));
check('"address in use" is shown only for that server text (the limit 409 is shown as an error)', /already belongs to another Biddex account/.test(html));

// the I18N block: every entry is  key: 'text'  (texts may hold escaped quotes)
const section = (re) => { const m = re.exec(html); return m ? m[1] : ''; };
const en = section(/\n  en: \{([\s\S]*?)\n  \},\n  ar:/), ar = section(/\n  ar: \{([\s\S]*?)\n  \}\n\};/);
const entries = (b) => { const o = {}; for (const m of b.matchAll(/(\w+): '((?:[^'\\]|\\.)*)'/g)) o[m[1]] = m[2]; return o; };
const E = entries(en), A = entries(ar);
check('English and Arabic have the same keys', Object.keys(E).length > 20 && JSON.stringify(Object.keys(E).sort()) === JSON.stringify(Object.keys(A).sort()));
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
check('every Arabic text has Arabic script and the same placeholders as the English one', Object.keys(E).every((k) => /[؀-ۿ]/.test(A[k] || '') && ph(E[k]) === ph(A[k] || '')));
check('the page links the terms and the privacy policy in the chosen language', /legalUrl\('terms'\)/.test(html) && /legalUrl\('privacy'\)/.test(html) && /'ar\/'/.test(html));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
