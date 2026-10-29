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
check('other texts are left as written', tr('Something else entirely') === 'Something else entirely' && tr('Cannot cancel an RFQ in AWARDED status') === 'Cannot cancel an RFQ in AWARDED status');
check('a user\'s own text inside an error is not touched', tr('Account suspended: late deliveries').indexOf('late deliveries') > 0);
check('not text -> returned as is', tr(undefined) === undefined && tr(42) === 42);

// teams (members.controller.js, invite.controller.js, permissions.js, auth.js): every text the server can send
const team = [
  'Your role in this company does not allow this action', 'You are no longer a member of this company', 'Invitation not found', 'Person not found',
  'You are not in this company', 'This company is not active', 'This person is already in your company',
  'An invitation to this address is already open; resend it instead', 'Please wait a minute before sending it again',
  'This invitation was sent too many times; cancel it and invite again', 'Too many invitations today; try again tomorrow',
  'Use "Leave the company" to remove yourself', 'A company needs at least one owner',
  'You are the last owner of this company: make someone else an owner first, or delete the company',
  'role must be MANAGER or STAFF', 'role must be OWNER, MANAGER or STAFF', 'Teams are only available for buyer companies for now',
  'This e-mail address already belongs to another Biddex account. Ask your company owner to invite a different address.',
  'This company has reached its limit of people', 'A company can have at most 3 owners', 'At most 10 invitations can be open at once',
  'Your company can have at most 10 people, invitations included', 'fullName is required', 'fullName must be at most 100 characters',
];
for (const s2 of team) check('team text translated: ' + s2.slice(0, 50), arabic(tr(s2)) && tr(s2) !== s2 && !/[A-Za-z]{4,}/.test(tr(s2).replace(/Biddex/g, '')));
check('numbers of the team limits stay', /3/.test(tr('A company can have at most 3 owners')) && /10/.test(tr('At most 10 invitations can be open at once')));
check('English team text is never changed', tr('You are no longer a member of this company', 'en') === 'You are no longer a member of this company');
// catalog import (catalog.controller.js bulkCreateItems): the per-row texts
const importTexts = ['name required', 'name must be at most 200 characters', 'brand must be text', 'brand must be at most 200 characters', 'unit required', 'unit must be one of: kg, pcs, box, carton, litre, ton',
  'price required', 'price must be a positive number', 'price can have at most 3 decimal places', 'price is too large', 'Could not save this row, please try again', 'at most 200 items per import'];
for (const s3 of importTexts) check('import text translated: ' + s3.slice(0, 50), arabic(tr(s3)) && tr(s3) !== s3 && !/\b(must|required|is|at most)\b/.test(tr(s3).replace(/kg, pcs, box, carton, litre, ton/, '')));
check('the units of the import text stay as written', tr('unit must be one of: kg, pcs, box, carton, litre, ton').includes('kg, pcs, box, carton, litre, ton') && tr('unit required', 'en') === 'unit required');
const loaders = ['index.html', 'bid.html', 'accept-invite.html', 'verify.html', 'reset-password.html'];
const versions = loaders.map((f) => (fs.readFileSync(path.join(__dirname, '..', f), 'utf8').match(/server-errors\.js\?v=(\d+)/) || [])[1]);
check('every page that loads server-errors.js uses the same ?v= (bumped together)', versions.every((v) => v && v === versions[0]), versions.join(','));

// baskets (the texts of src/utils/basket*.js, rfq.controller.js, quote.controller.js, approval.controller.js)
const basketTexts = [
  'This request is a basket: answer each item instead of one unit price', 'This request is not a basket: send a unit price', 'This request is not a basket',
  'This request is a basket: items must be a list with an answer for every item', 'A basket has no quantity, unit or brand of its own: put them on its items', 'Baskets are not available yet',
  'Some items are not covered by this quote: confirm to order without them', "The order is below the supplier's minimum order: confirm to order anyway",
  'Nothing to order: this quote covers none of the items you accepted', 'Price at least one item: if you have none of them, do not send an answer', 'The total of the items is too large',
  'acceptedItemIds must be a list of item ids', 'acceptedItemIds must name analogues offered by this quote', 'This quote is not a basket quote', 'You have no quote on this request yet',
  'The buyer is deciding on this request: your answer can no longer be changed', 'A product you picked is no longer available', 'The offer changed while this request waited', 'Purchase order not found',
  'items must be a list of 1 to 50 items', 'item 3: name is required', 'answer 2: quantity must be a whole number between 1 and 100000000', '"Flour" has no answer: give a price, "not in stock" or an analogue',
  '"Salt" is for the asked brand only: an analogue is not allowed', '"Salt" is marked not in stock, so it takes no price or replacement', '"Salt" is answered twice',
];
for (const s of basketTexts) check('basket text translated: ' + s, arabic(tr(s)) && tr(s) !== s && tr(s, 'en') === s);
check('basket texts keep the item name and the numbers as written', tr('"Flour" has no answer: give a price, "not in stock" or an analogue').includes('Flour') && /50/.test(tr('items must be a list of 1 to 50 items')) && /^العنصر 3:/.test(tr('item 3: name is required')) && /^الإجابة 2:/.test(tr('answer 2: "Flour" is answered twice')));
check('an item\'s own error is translated inside its number, an unknown one is left as written after it', arabic(tr('item 2: name is required')) && /^العنصر 2: some new text$/.test(tr('item 2: some new text')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
