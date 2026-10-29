// Run: node test/basket.test.js   (no dependencies)
// Baskets (one request for many items) in index.html: the helpers (titles, the items of a request, the link and the WhatsApp text), the form, the lists,
// the wiring, and every text in English and Arabic.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const has = (s) => html.includes(s);

// ---- the texts of both languages (the same extraction the other tests use)
const i18nStart = html.indexOf('const I18N = {');
const I18N = new Function(html.slice(i18nStart, html.indexOf('\n};', i18nStart) + 3).replace('const I18N =', 'return'))();
const en = I18N.en, ar = I18N.ar;

const a = html.indexOf('// BEGIN BASKET HELPERS'), b = html.indexOf('// END BASKET HELPERS');
check('the helpers block is in index.html', a > 0 && b > a);
const lib = new Function(html.slice(a, b) + '; return { BASKET_MAX_ITEMS, bkTitleText, bkIsAutoTitle, bkEmptyItem, bkItemsForRequest, bkRowsFromServer, bkLinkOf, bkShareText, bkWhatsAppUrl };')();

// ---- titles: the server stores English, the user sees his language
check('the automatic name is shown in English and in Arabic ("Basket · 6 items", one item, 0 never)', lib.bkTitleText('Basket · 6 items', en) === 'Basket · 6 items' && lib.bkTitleText('Basket · 6 items', ar) === 'سلة · 6 عناصر' && lib.bkTitleText('Basket · 1 item', ar) === 'سلة · عنصر واحد' && lib.bkTitleText('Basket · 1 item', en) === 'Basket · 1 item');
check('a name the buyer typed is never changed; the re-post suffix is translated for both kinds of name', lib.bkTitleText('Weekly order', ar) === 'Weekly order' && lib.bkTitleText('Weekly order · missing items', ar) === 'Weekly order · العناصر الناقصة' && lib.bkTitleText('Basket · 4 items · missing items', ar) === 'سلة · 4 عناصر · العناصر الناقصة' && lib.bkTitleText('Basket · 4 items · missing items', en) === 'Basket · 4 items · missing items');
check('titles that only look similar are left alone; empty and missing titles give an empty text', lib.bkTitleText('My Basket · 6 items', ar) === 'My Basket · 6 items' && lib.bkTitleText('Basket · six items', ar) === 'Basket · six items' && lib.bkTitleText('', ar) === '' && lib.bkTitleText(null, ar) === '' && lib.bkTitleText(undefined, en) === '');
check('bkIsAutoTitle knows only the automatic English name (the edit form leaves such a name empty)', lib.bkIsAutoTitle('Basket · 3 items') && lib.bkIsAutoTitle('Basket · 1 item') && !lib.bkIsAutoTitle('Weekly') && !lib.bkIsAutoTitle('') && !lib.bkIsAutoTitle('Basket · 3 items · missing items'));

// ---- the rows of the form
const row = (o) => ({ ...lib.bkEmptyItem(), name: 'Flour', quantity: '5', ...o });
let r = lib.bkItemsForRequest([row({}), row({ name: ' Salt ', quantity: '10', unit: 'litre', brand: ' Al Marai ', productId: 'p1', allowSubstitute: false })]);
check('rows -> items: names and brands trimmed, numbers made numbers, a catalog product and "only this brand" kept, "analogue is fine" is the default',
  r.items && r.items.length === 2 && r.items[0].name === 'Flour' && r.items[0].quantity === 5 && r.items[0].allowSubstitute === true && !('brand' in r.items[0]) && !('productId' in r.items[0]) &&
  r.items[1].name === 'Salt' && r.items[1].brand === 'Al Marai' && r.items[1].productId === 'p1' && r.items[1].allowSubstitute === false && r.items[1].unit === 'litre', r);
check('an empty list, more than 50 rows, a row without a name, a bad quantity: the first error with the row number', lib.bkItemsForRequest([]).error === 'bkNeedItems' && lib.bkItemsForRequest(Array.from({ length: 51 }, () => row({}))).error === 'bkTooMany' && lib.BASKET_MAX_ITEMS === 50 &&
  JSON.stringify(lib.bkItemsForRequest([row({}), row({ name: '  ' })])) === '{"error":"bkItemNameRequired","n":2}' && JSON.stringify(lib.bkItemsForRequest([row({ quantity: '' })])) === '{"error":"bkItemQtyWhole","n":1}');
check('quantities: whole numbers from 1 to 100 000 000 only (no decimals, zero, negatives, text, too big)', ['2.5', '0', '-3', 'ten', '1e3', '100000001', ' '].every((q) => lib.bkItemsForRequest([row({ quantity: q })]).error === 'bkItemQtyWhole') && lib.bkItemsForRequest([row({ quantity: '100000000' })]).items[0].quantity === 100000000 && lib.bkItemsForRequest([row({ quantity: ' 7 ' })]).items[0].quantity === 7);
check('exactly 50 rows are fine', lib.bkItemsForRequest(Array.from({ length: 50 }, (_, i) => row({ name: 'Item ' + i }))).items.length === 50);
const back = lib.bkRowsFromServer([{ name: 'Salt', unit: 'kg', quantity: 10, brand: null, productId: null, allowSubstitute: false }, { name: 'Oil', unit: 'litre', quantity: 3, brand: 'X', productId: 'p9' }]);
check('rows from the server (an edit, a re-post): the quantity as text, nothing missing becomes "null", "analogue is fine" unless the server says no', back[0].quantity === '10' && back[0].brand === '' && back[0].productId === undefined && back[0].allowSubstitute === false && back[1].allowSubstitute === true && back[1].productId === 'p9' && lib.bkRowsFromServer(null).length === 0);

// ---- the link and WhatsApp
check('the link is the hash route of the request, with the id escaped', lib.bkLinkOf('https://app.biddex.online', '/', 'abc-123') === 'https://app.biddex.online/#/rfq/abc-123' && lib.bkLinkOf('http://localhost:8080', '/index.html', 'a b') === 'http://localhost:8080/index.html#/rfq/a%20b');
const text = lib.bkShareText('Basket · 6 items', 'https://x/#/rfq/1', en, ar);
check('the WhatsApp text: the title and the link, in both languages, nothing else (no company, no quantities, no prices)', text === 'Biddex request: Basket · 6 items\nطلب تسعير على Biddex: سلة · 6 عناصر\nhttps://x/#/rfq/1', text);
check('the WhatsApp address carries the text, escaped', lib.bkWhatsAppUrl('a b\nc') === 'https://wa.me/?text=a%20b%0Ac' && lib.bkWhatsAppUrl('x').startsWith('https://wa.me/?text='));

// ---- the texts
const keys = Object.keys(en).filter((k) => /^bk[A-Z]/.test(k));
check('every basket text exists in English and in Arabic, with the same placeholders', keys.length >= 40 && keys.every((k) => typeof ar[k] === 'string' && ar[k].length > 0 && JSON.stringify((en[k].match(/\{\w+\}/g) || []).sort()) === JSON.stringify((ar[k].match(/\{\w+\}/g) || []).sort())), keys.filter((k) => !ar[k]));
check('...and every Arabic text is in Arabic script (the brand and numbers stay Latin)', keys.every((k) => /[؀-ۿ]/.test(ar[k])), keys.filter((k) => !/[؀-ۿ]/.test(ar[k])));
check('there is no Arabic basket text without an English one', Object.keys(ar).filter((k) => /^bk[A-Z]/.test(k)).every((k) => k in en));

// ---- wiring
check('the form button shows only for a buyer the baskets are on for (the server sends basketEnabled), who may prepare a request', has("const basketOn = () => state.view === 'buyer' && !!(state.user && state.user.basketEnabled === true) && can('rfq.draft');") && has("return basketOn() ? '<button onclick=\"openBasket()\""));
check('"New basket" sits next to "Create new RFQ" on the buyer hub and on the RFQs page', html.split("bkNewButton('").length - 1 === 2);
check('creating: POST /rfqs with items and (for a re-post) repostOfLpoId; editing: PATCH with items; "publish" only for a person who may publish', has("api('/api/rfqs', { method: 'POST', body: JSON.stringify({ ...fields, publish: publishes, ...(f.repostOfLpoId ? { repostOfLpoId: f.repostOfLpoId } : {}) }) })") && has("api('/api/rfqs/' + encodeURIComponent(editId), { method: 'PATCH'"));
check('the optional name is sent only when typed (the server names it "Basket · N items"); an automatic name is not put back into the edit form', has("...((f.title || '').trim() ? { title: f.title.trim() } : {})") && has("title: bkIsAutoTitle(r.title) ? '' : (r.title || '')"));
check('a basket that got bids can no longer be edited (409): the form closes and says so', has("if (f.editId && e.status === 409) { bkSearchReset(); setState({ showBasket: false, basketForm: null }); showToast(t('bkLocked'));"));
check('typing in the form goes straight into the state without a render (document listeners on data-bk / data-bks)', has("document.addEventListener('input', bkDocInput);") && has("document.addEventListener('change', bkDocChange);") && has("if (k === 'name' && row.productId) row.productId = undefined;"));
check('the catalog search paints without a render and a picked product fills an empty row first', has("document.getElementById('bk-search-area')") && has('// an empty row is used first') && has("api('/api/catalog/search?q=' + encodeURIComponent(q))"));
check('the form is a window the Back button closes, and it is drawn with the other windows', has("['basket', s => !!s.showBasket, () => closeBasket()]") && has('if (state.showBasket) html += renderBasketModal();'));
check('Edit on a basket opens the basket form (not the single-request form)', has('if (r.isBasket) { openEditBasket(rfqId); return; }'));
check('the lists show the title in the user\'s language and a "Basket · N items" pill', html.split('esc(rfqTitle(r))').length - 1 >= 2 && html.split("bkItemsPill(r)").length - 1 >= 2);
check('a published basket has "Copy link" and "Share via WhatsApp" (the buttons never open the row underneath)', has("if (!r.isBasket || r.status !== 'PUBLISHED') return '';") && has('event.stopPropagation(); copyBasketLink(') && has('event.stopPropagation(); shareBasketWhatsApp(') && has('bkShareButtons(r) +'));
check('sharing uses the title and the link only, WhatsApp opens in a new tab without an opener', has("bkShareText(r.title, bkLink(id), I18N.en, I18N.ar)") && has("window.open(bkWhatsAppUrl(text), '_blank', 'noopener')"));
check('the form never prints a typed value unescaped (esc on every value)', ['esc(it.name)', 'esc(it.quantity)', 'esc(it.brand)', 'esc(f.title)', 'esc(f.budget)', 'esc(f.specifications || \'\')'].every(has));

// ================= the supplier's answer =================
const pm = html.slice(html.indexOf('function parseMoneyInput(raw){'), html.indexOf('\n}\n', html.indexOf('function parseMoneyInput(raw){')) + 2);
const a2 = html.indexOf('// BEGIN BASKET ANSWER HELPERS'), b2 = html.indexOf('// END BASKET ANSWER HELPERS');
check('the answer helpers block is in index.html', a2 > 0 && b2 > a2);
const ans = new Function(pm + html.slice(a2, b2) + '; return { bkaLineFils, bkaSummary, bkaBuild, bkaRowsFromQuote };')();
const items = [
  { id: 'i1', name: 'Flour', quantity: 50, unit: 'kg', allowSubstitute: true },
  { id: 'i2', name: 'Salt', quantity: 10, unit: 'kg', allowSubstitute: false },
  { id: 'i3', name: 'Oil', quantity: 4, unit: 'litre', allowSubstitute: true },
];
const R = (o) => ({ status: '', unitPrice: '', substituteName: '', substituteBrand: '', ...o });
const head = { days: '2', terms: '30', minOrder: '', notes: '' };
check('a line: price × quantity in fils; nothing for "not in stock", an empty or a bad price', ans.bkaLineFils(items[0], R({ status: 'PRICED', unitPrice: '0.5' })) === 25000 && ans.bkaLineFils(items[2], R({ status: 'SUBSTITUTE', unitPrice: '3,2' })) === 12800 && ans.bkaLineFils(items[0], R({ status: 'UNAVAILABLE' })) === null && ans.bkaLineFils(items[0], R({ status: 'PRICED' })) === null && ans.bkaLineFils(items[0], R({ status: 'PRICED', unitPrice: '1.2345' })) === null && ans.bkaLineFils(items[0], R({ status: 'PRICED', unitPrice: '0' })) === null && ans.bkaLineFils(items[0], undefined) === null);
const rowsA = { i1: R({ status: 'PRICED', unitPrice: '0.5' }), i2: R({ status: 'UNAVAILABLE' }), i3: R({ status: 'SUBSTITUTE', unitPrice: '3.2', substituteName: 'Other oil' }) };
check('the summary: rows answered, rows with a price (analogues count: they can be supplied), and their total', JSON.stringify(ans.bkaSummary(items, rowsA)) === '{"n":3,"answered":3,"covered":2,"totalFils":37800}' && JSON.stringify(ans.bkaSummary(items, {})) === '{"n":3,"answered":0,"covered":0,"totalFils":0}' && ans.bkaSummary(items, { i1: R({ status: 'PRICED' }) }).answered === 1);
let built = ans.bkaBuild(items, rowsA, head, false);
check('the body: a price, "not in stock" with nothing else, an analogue with its name; days and terms as numbers; no minimum, no notes unless typed', built.body && JSON.stringify(built.body.items) === JSON.stringify([{ rfqItemId: 'i1', status: 'PRICED', unitPrice: 0.5 }, { rfqItemId: 'i2', status: 'UNAVAILABLE' }, { rfqItemId: 'i3', status: 'SUBSTITUTE', unitPrice: 3.2, substituteName: 'Other oil' }]) && built.body.deliveryTimeDays === 2 && built.body.paymentTermsDays === 30 && !('minOrderAmount' in built.body) && !('notes' in built.body), built);
built = ans.bkaBuild(items, rowsA, { days: '3', terms: '', minOrder: ' 20 ', notes: ' call me ' }, false);
check('terms left empty mean 30; the minimum and the notes are sent when typed (trimmed)', built.body.paymentTermsDays === 30 && built.body.minOrderAmount === 20 && built.body.notes === 'call me' && built.body.deliveryTimeDays === 3);
check('when changing an answer, an emptied minimum is sent as null (it clears the old one); when creating it is left out', ans.bkaBuild(items, rowsA, head, true).body.minOrderAmount === null && !('minOrderAmount' in ans.bkaBuild(items, rowsA, head, false).body));
check('an item without an answer: "answer every item first" with how many are left (a missing answer is not "not in stock")', JSON.stringify(ans.bkaBuild(items, { i1: rowsA.i1 }, head)) === '{"error":"bkaNeedAnswers","left":2}' && ans.bkaBuild(items, {}, head).left === 3);
check('a price that is missing or has more than 3 decimals is refused with the item number', JSON.stringify(ans.bkaBuild(items, { ...rowsA, i1: R({ status: 'PRICED', unitPrice: '' }) }, head)) === '{"error":"bkaPriceBad","n":1}' && ans.bkaBuild(items, { ...rowsA, i3: R({ status: 'SUBSTITUTE', unitPrice: '1.2345', substituteName: 'x' }) }, head).n === 3);
check('an analogue needs a name; an analogue is refused where the buyer said "only this brand"', JSON.stringify(ans.bkaBuild(items, { ...rowsA, i3: R({ status: 'SUBSTITUTE', unitPrice: '3', substituteName: '  ' }) }, head)) === '{"error":"bkaSubNameNeeded","n":3}' && ans.bkaBuild(items, { ...rowsA, i2: R({ status: 'SUBSTITUTE', unitPrice: '1', substituteName: 'Other salt' }) }, head).error === 'bkaSubNameNeeded');
check('at least one item must have a price (all "not in stock" is not an answer)', ans.bkaBuild(items, { i1: R({ status: 'UNAVAILABLE' }), i2: R({ status: 'UNAVAILABLE' }), i3: R({ status: 'UNAVAILABLE' }) }, head).error === 'bkaNeedOnePrice');
check('delivery days (0-365, whole), payment terms (0-120) and the minimum (an amount) are checked', ans.bkaBuild(items, rowsA, { ...head, days: '' }).error === 'bkaDaysNeeded' && ans.bkaBuild(items, rowsA, { ...head, days: '366' }).error === 'bkaDaysNeeded' && ans.bkaBuild(items, rowsA, { ...head, days: '2.5' }).error === 'bkaDaysNeeded' && ans.bkaBuild(items, rowsA, { ...head, days: '0' }).body.deliveryTimeDays === 0 &&
  ans.bkaBuild(items, rowsA, { ...head, terms: '121' }).error === 'bidTermsError' && ans.bkaBuild(items, rowsA, { ...head, terms: 'x' }).error === 'bidTermsError' && ans.bkaBuild(items, rowsA, { ...head, minOrder: 'abc' }).error === 'bkaMinBad' && ans.bkaBuild(items, rowsA, { ...head, minOrder: '0' }).error === 'bkaMinBad');
check('an optional analogue brand is sent only when typed', ans.bkaBuild(items, { ...rowsA, i3: R({ status: 'SUBSTITUTE', unitPrice: '3', substituteName: 'x', substituteBrand: ' B ' }) }, head).body.items[2].substituteBrand === 'B' && !('substituteBrand' in ans.bkaBuild(items, rowsA, head).body.items[2]));
const earlier = ans.bkaRowsFromQuote({ items: [{ rfqItemId: 'i1', status: 'PRICED', unitPrice: '0.500', substituteName: null }, { rfqItemId: 'i3', status: 'SUBSTITUTE', unitPrice: '3.200', substituteName: 'Other oil', substituteBrand: 'B' }, { rfqItemId: 'i2', status: 'UNAVAILABLE', unitPrice: null }] });
check('"Change your answer": the earlier answer fills the form (prices as plain numbers)', earlier.i1.unitPrice === '0.5' && earlier.i3.substituteName === 'Other oil' && earlier.i3.substituteBrand === 'B' && earlier.i2.status === 'UNAVAILABLE' && earlier.i2.unitPrice === '' && Object.keys(ans.bkaRowsFromQuote(null)).length === 0);

// ---- wiring of the answer
check('"Submit quote" on a basket opens the answer form; a single request keeps its own form', has("if (basket && basket.isBasket) { openBasketAnswer(rfqId); return; }"));
check('sending: POST a new answer, PUT .../quotes/mine to change one; the feed card is updated at once', has("api('/api/rfqs/' + encodeURIComponent(rfqId) + '/quotes', { method: 'POST', body: JSON.stringify(built.body) })") && has("api('/api/rfqs/' + encodeURIComponent(rfqId) + '/quotes/mine', { method: 'PUT', body: JSON.stringify(built.body) })") && has("unitPrice: null, createdAt: quote.createdAt"));
check('"Mark the rest as not in stock" touches only the items without an answer; "Clear answers" empties the form', has('for (const it of a.rfq.items) if (!(rows[it.id] && rows[it.id].status)) rows[it.id] = { ...bkaEmptyRow(), status: \'UNAVAILABLE\' };') && has('function bkaClear(){'));
check('the totals are repainted in place while typing (no render, so the focus stays)', has("document.addEventListener('input', bkaDocInput);") && has("document.getElementById('bka-total')") && has("document.getElementById('bka-line-' + it.id)"));
check('an answer that cannot be changed any more (409: the owner is deciding, already answered, or the buyer acted) closes the form with the reason', has("/deciding/.test(e.message) ? t('bkaApprovalWaits')") && has("t('quoteAlreadySubmitted')") && has("t('bkaLocked')"));
check('the feed card of a basket: the title, a pill, the number of items instead of a quantity, the supplier\'s own total, and "Change your answer" while it can still be changed', has("esc(rfqTitle(r)) + bkItemsPill(r) + '</div>'") && has("r.isBasket ? esc(tpl('bkaItemsOf', { n: r.itemCount || 0 }))") && has("tpl('bkaYourAnswer', { price: '<b>' + bhdMoney(ownQuote.price) + '</b>' })") && has("r.isBasket && ownQuote.status === 'SUBMITTED' && !tl.past ?"));
check('the answer form is a window the Back button closes and its link is #/rfq/<id> (the link a buyer shares)', has("['bkAnswer', s => !!s.bkAnswer, () => closeBasketAnswer()]") && has("topOverlay() === 'bkAnswer'") && has('(state.bkAnswer && state.bkAnswer.rfqId)'));
check('"analogue" is switched off (not clickable) for an item the buyer wants in the asked brand only', has("seg(it.id, 'SUBSTITUTE', t('bkaAnalogue'), row.status === 'SUBSTITUTE', !it.allowSubstitute)") && has("(disabled ? ' opacity:.4; cursor:not-allowed;' : '')"));
check('the item name, brand, analogue name and typed values of the answer are escaped', ['esc(it.name)', 'esc(it.brand)', 'esc(row.substituteName)', 'esc(row.substituteBrand)', 'esc(row.unitPrice)', 'esc(a.head.minOrder)', 'esc(a.rfq.specifications)'].every((x) => has(x) || x.includes('head.minOrder') && has('esc(value)')));
const keys2 = Object.keys(en).filter((k) => /^bka[A-Z]/.test(k));
check('every answer text exists in English and Arabic (Arabic script, same placeholders)', keys2.length >= 30 && keys2.every((k) => typeof ar[k] === 'string' && /[؀-ۿ]/.test(ar[k]) && JSON.stringify((en[k].match(/\{\w+\}/g) || []).sort()) === JSON.stringify((ar[k].match(/\{\w+\}/g) || []).sort())), keys2.filter((k) => !ar[k]));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
