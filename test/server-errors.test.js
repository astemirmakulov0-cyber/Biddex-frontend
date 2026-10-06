// Run: node test/server-errors.test.js   (no dependencies)
// The Arabic wording of the server's English error texts (server-errors.js), including the shapes of the input checks.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'server-errors.js'), 'utf8');
const win = {};
new Function('window', src)(win);
const tr = (text, lang = 'ar') => win.serverError(text, lang);

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const arabic = (s) => /[؀-ۿ]/.test(s);

check('English is never changed', tr('title must be at most 200 characters', 'en') === 'title must be at most 200 characters' && tr('title is required', 'en') === 'title is required');
check('exact texts keep their own wording (they win over the shapes)', tr('email is required') === 'البريد الإلكتروني مطلوب' && arabic(tr('deliveryTimeDays must be a whole number between 0 and 365')) && !/«/.test(tr('deliveryTimeDays must be a whole number between 0 and 365')) && !/«/.test(tr('email is required')));

// every shape the backend produces (src/utils/validate.js and money.js)
const samples = [
  'title must be at most 200 characters', 'companyName must be at most 200 characters', 'body must be at most 2000 characters', 'terms must be at most 2000 characters',
  'title must be text', 'phone must be text', 'currentPassword must be text', 'productId must be text',
  'title is required', 'name is required', 'companyName is required',
  'quantity must be a whole number between 1 and 100000000',
  'publish must be true or false', 'isActive must be true or false',
  'budget must be a positive number', 'price must be a positive number', 'amount must be a positive number',
  'budget can have at most 3 decimal places', 'amount can have at most 3 decimal places',
  'budget is too large', 'amount is too large',
];
for (const s of samples) check('translated: ' + s, arabic(tr(s)) && tr(s) !== s && !/\bmust\b|\bis\b/.test(tr(s)));

check('the field name is shown in Arabic and the numbers stay', /«العنوان»/.test(tr('title must be at most 200 characters')) && /200/.test(tr('title must be at most 200 characters')) && /1/.test(tr('quantity must be a whole number between 1 and 100000000')) && /100000000/.test(tr('quantity must be a whole number between 1 and 100000000')));
check('an unknown field name is shown as it is', /«someNewField»/.test(tr('someNewField must be text')));
check('too-large and malformed bodies', tr('Request body is too large') === 'حجم الطلب كبير جدًا' && tr('Invalid JSON body') === 'تعذّرت قراءة الطلب');
check('other texts are left as written', tr('Something else entirely') === 'Something else entirely' && tr('Cannot award an RFQ in CANCELLED status') === 'Cannot award an RFQ in CANCELLED status');
check('a user\'s own text inside an error is not touched', tr('Account suspended: late deliveries').indexOf('late deliveries') > 0);
check('not text -> returned as is', tr(undefined) === undefined && tr(42) === 42);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
