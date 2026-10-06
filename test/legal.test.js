// Run: node test/legal.test.js   (no dependencies)
// The legal pages are generated in Biddex-landing (node tools/build-legal.js); this checks the copies served by the app.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };

const pages = { 'privacy.html': 'en', 'terms.html': 'en', 'ar/privacy.html': 'ar', 'ar/terms.html': 'ar' };
for (const [f, lang] of Object.entries(pages)) {
  const exists = fs.existsSync(path.join(root, f));
  check(f + ' exists', exists);
  if (!exists) continue;
  const h = read(f);
  check(f + ': no placeholders ([date], *.example, {{ }}, TODO)', !/\[date\]|\.example|\{\{|TODO|FIXME/i.test(h));
  check(f + ': language and direction', lang === 'ar' ? /<html lang="ar" dir="rtl">/.test(h) : /<html lang="en">/.test(h));
  check(f + ': contact — support e-mail and WhatsApp', h.includes('mailto:support@biddex.online') && h.includes('https://wa.me/97333327347') && h.includes('+973 3332 7347'));
  check(f + ': an effective date', /\b2026\b/.test(h) && /(Effective from|سارية اعتبارًا من) \d{1,2} /.test(h));
  check(f + ': English and Arabic switch', h.includes('hreflang="en"') && h.includes('hreflang="ar"'));
}
const en = read('privacy.html'), ar = read('ar/privacy.html');
const h2 = (h) => (h.match(/<h2>/g) || []).length;
check('privacy: the same number of sections in English and Arabic', h2(en) === h2(ar) && h2(en) >= 10);
check('terms: the same number of sections in English and Arabic', h2(read('terms.html')) === h2(read('ar/terms.html')));
check('privacy names the processors and their regions (English)', ['Neon', 'Railway', 'Resend', 'Sentry', 'Ohio', 'Virginia', 'California', 'Tokyo', 'European Union'].every((x) => en.includes(x)));
check('privacy names the processors and their regions (Arabic)', ['Neon', 'Railway', 'Resend', 'Sentry', 'أوهايو', 'فرجينيا', 'كاليفورنيا', 'طوكيو', 'الاتحاد الأوروبي'].every((x) => ar.includes(x)));
check('privacy: transfers outside Bahrain, no separate agreements, the 30-day backup', /Transfers outside Bahrain/.test(en) && /not signed separate data-processing agreements/.test(en) && /30 more days/.test(en) && /30 يومًا/.test(ar));
check('privacy: daily database copies, 30 days, US West, not separately encrypted (English and Arabic)', /daily copy of the Biddex database/.test(en) && /each database copy is kept for 30 days/.test(en) && /do not encrypt these copies/.test(en) && /US West[ (,]+California/.test(en) && /نسخة يومية من قاعدة بيانات Biddex/.test(ar) && /ولا نشفّر هذه النسخ/.test(ar));
check('privacy: rights point at the real buttons', /Download my data/.test(en) && /Delete account/.test(en) && /تنزيل بياناتي/.test(ar) && /حذف الحساب/.test(ar));
check('both languages say the English version prevails', /English version prevails/.test(en) && /النسخة الإنجليزية/.test(ar));

const app = read('index.html');
check('app: consent and Settings links are language-aware (legalUrl)', /function legalUrl\(page\)\{ return \(state\.lang === 'ar' \? 'ar\/' : ''\) \+ page \+ '\.html'; \}/.test(app) && !/href="terms\.html"|href="privacy\.html"/.test(app) && (app.match(/legalUrl\('(privacy|terms)'\)/g) || []).length >= 4);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
