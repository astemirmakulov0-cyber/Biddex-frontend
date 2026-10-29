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

// ================= comparing the answers =================
const a3 = html.indexOf('// BEGIN BASKET COMPARE HELPERS'), b3 = html.indexOf('// END BASKET COMPARE HELPERS');
check('the compare helpers block is in index.html', a3 > 0 && b3 > a3);
const cmp = new Function(html.slice(a3, b3) + '; return { bkCoverageLevel, bkCmpRows };')();
check('coverage level: every item = full, some = partial, none = none (no data = none)', cmp.bkCoverageLevel({ total: 20, covered: 20 }) === 'full' && cmp.bkCoverageLevel({ total: 20, covered: 18 }) === 'partial' && cmp.bkCoverageLevel({ total: 20, covered: 0 }) === 'none' && cmp.bkCoverageLevel({ total: 0, covered: 0 }) === 'none' && cmp.bkCoverageLevel(null) === 'none' && cmp.bkCoverageLevel(undefined) === 'none');
const quote = { items: [
  { rfqItemId: 'i3', status: 'SUBSTITUTE', unitPrice: '3.200', substituteName: 'Other oil', substituteBrand: 'B', isBestPrice: false },
  { rfqItemId: 'i1', status: 'PRICED', unitPrice: '0.500', isBestPrice: true },
  { rfqItemId: 'i2', status: 'UNAVAILABLE', unitPrice: null },
] };
const crow = cmp.bkCmpRows(quote, items);
check('item by item: in the order of the items, the price, the line total in fils, the best price marked, the analogue named', crow.map((x) => x.id).join() === 'i1,i2,i3' && crow[0].unitPrice === 0.5 && crow[0].lineFils === 25000 && crow[0].best === true && crow[1].status === 'UNAVAILABLE' && crow[1].lineFils === null && crow[2].status === 'SUBSTITUTE' && crow[2].substituteName === 'Other oil' && crow[2].lineFils === 12800 && crow[2].best === false, crow);
check('an item the supplier gave no answer to has no status; no answers or no items give no rows', cmp.bkCmpRows({ items: [] }, items).every((x) => x.status === null && x.lineFils === null) && cmp.bkCmpRows(null, items).length === 3 && cmp.bkCmpRows(quote, null).length === 0);
check('Compare bids: a basket is compared in a wider window with coverage ("18 of 20"), analogues, the not-covered count, the total of what it can supply and the minimum order', has("(compareRfq && compareRfq.isBasket ? 'max-w-3xl' : 'max-w-lg')") && has("tpl('bkcCovered', { covered: c.covered, n: c.total })") && has("tpl('bkcPricedTotal', { total: '<b>' + bhdMoney(x.price) + '</b>' })") && has("tpl('bkcMinOrder', { amount: bhdMoney(x.minOrderAmount) })") && has("(x.coverage ? bkQuoteSummaryHtml(x)"));
check('a single-request bid keeps its price line; only a bid with a coverage object gets the basket view', has("'<div class=\"mono mt-0.5 text-[12px]\" style=\"color:var(--tx3);\">' + quotePriceText(x) + ' &middot; ' + tpl('quoteMeta'") && has("(x.coverage ? bkQuoteDetailHtml(x) : '')"));
check('the item-by-item view is collapsed until asked for, needs the request\'s items (loaded when Compare bids opens), lists what is not covered, marks the best price', has("if (!open || !items) return btn;") && has('async function loadCompareItems(rfqId){') && has("if (!listed || listed.isBasket) loadCompareItems(rfqId);") && has("t('bkcBestPrice')") && has("tpl('bkcNotCovered', { items: esc(missing.map((r) => r.name).join(', ')) })"));
check('everything from the server in the comparison is escaped (names, analogue names, brands, quantities)', has('esc(r.name)') && has("esc(tpl('bkcAnalogueFor', { name: r.substituteName + (r.substituteBrand ? ' (' + r.substituteBrand + ')' : '') }))") && has('esc(r.quantity)'));
const keys3 = Object.keys(en).filter((k) => /^bkc[A-Z]/.test(k));
check('every comparison text exists in English and Arabic (Arabic script, same placeholders)', keys3.length >= 14 && keys3.every((k) => typeof ar[k] === 'string' && /[؀-ۿ]/.test(ar[k]) && JSON.stringify((en[k].match(/\{\w+\}/g) || []).sort()) === JSON.stringify((ar[k].match(/\{\w+\}/g) || []).sort())), keys3.filter((k) => !ar[k]));

// ================= the award window =================
const a4 = html.indexOf('// BEGIN BASKET AWARD HELPERS'), b4 = html.indexOf('// END BASKET AWARD HELPERS');
check('the award helpers block is in index.html', a4 > 0 && b4 > a4);
const aw = new Function(html.slice(a4, b4) + '; return { bkAnalogueRows, bkAwardBody, bkAwardReady };')();
const itemsAw = [{ id: 'i1', name: 'Flour', unit: 'kg', quantity: 50 }, { id: 'i2', name: 'Salt', unit: 'kg', quantity: 10 }, { id: 'i3', name: 'Oil', unit: 'litre', quantity: 4 }];
const anal = aw.bkAnalogueRows({ items: [{ rfqItemId: 'i1', status: 'PRICED', unitPrice: '0.500' }, { rfqItemId: 'i3', status: 'SUBSTITUTE', unitPrice: '3.200', substituteName: 'Other oil', substituteBrand: 'B' }, { rfqItemId: 'zz', status: 'SUBSTITUTE', unitPrice: '1' }] }, itemsAw);
check('the analogues of an answer: only the ones that name an item of the request, with the price and the line total', anal.length === 1 && anal[0].id === 'i3' && anal[0].substituteName === 'Other oil' && anal[0].unitPrice === 3.2 && anal[0].lineFils === 12800 && aw.bkAnalogueRows(null, itemsAw).length === 0 && aw.bkAnalogueRows({ items: [] }, null).length === 0);
const planFull = { partial: false, belowMin: false, missing: [] };
const planPartial = { partial: true, belowMin: false, missing: [{ rfqItemId: 'i2', name: 'Salt' }] };
const planBoth = { partial: true, belowMin: true, missing: [{ rfqItemId: 'i2', name: 'Salt' }, { rfqItemId: 'i3', name: 'Oil' }] };
const W = (o) => ({ accepted: [], confirmPartial: false, confirmBelow: false, repost: true, ...o });
check('the body always says whether to re-post (true or false) and always lists the accepted analogues', JSON.stringify(aw.bkAwardBody(W({}), planPartial)) === '{"terms":"Standard terms","acceptedItemIds":[],"confirmPartial":false,"confirmBelowMin":false,"repostMissing":true}' && aw.bkAwardBody(W({ repost: false }), planPartial).repostMissing === false && 'repostMissing' in aw.bkAwardBody(W({}), planFull) && aw.bkAwardBody(W({ accepted: ['i3'] }), planPartial).acceptedItemIds[0] === 'i3');
check('"re-post" is true only when something is missing (nothing to post again otherwise), whatever the box says', aw.bkAwardBody(W({ repost: true }), planFull).repostMissing === false && aw.bkAwardBody(W({ repost: true }), planPartial).repostMissing === true && aw.bkAwardBody(W({ repost: true }), null).repostMissing === false);
check('a confirmation is sent only where the plan asks for one and the buyer ticked it', aw.bkAwardBody(W({ confirmPartial: true, confirmBelow: true }), planFull).confirmPartial === false && aw.bkAwardBody(W({ confirmPartial: true, confirmBelow: true }), planFull).confirmBelowMin === false && aw.bkAwardBody(W({ confirmPartial: true }), planPartial).confirmPartial === true && aw.bkAwardBody(W({ confirmPartial: true, confirmBelow: true }), planBoth).confirmBelowMin === true && aw.bkAwardBody(W({ confirmPartial: true }), planBoth).confirmBelowMin === false);
check('the button works only when every warning is confirmed (and never without a plan)', aw.bkAwardReady(W({}), planFull) === true && aw.bkAwardReady(W({}), planPartial) === false && aw.bkAwardReady(W({ confirmPartial: true }), planPartial) === true && aw.bkAwardReady(W({ confirmPartial: true }), planBoth) === false && aw.bkAwardReady(W({ confirmPartial: true, confirmBelow: true }), planBoth) === true && aw.bkAwardReady(W({}), null) === false && aw.bkAwardReady(W({}), undefined) === false);
check('the window: "Automatically re-post missing items" is ticked by default and is shown only when something is missing and baskets are on for this buyer', has("accepted: [], chk: null, loading: true, busy: false, confirmPartial: false, confirmBelow: false, repost: true }") && has("(plan.missing.length && basketOn() ?") && has("t('bkwRepost')"));
check('picking a basket\'s bid opens its own window (not the single-request one); one window at a time', has("if (bq && bq.coverage) { openBasketAward(quoteId); return; }") && has("if (state.awardCheck || state.awardBusy || state.bkAward) return;"));
check('the plan comes from GET /quotes/:id/award-check?accept=<ids>; ticking or unticking an analogue asks again and starts the confirmations over', has("'/award-check' + (w.accepted.length ? '?accept=' + w.accepted.map(encodeURIComponent).join(',') : '')") && has('loading: true, confirmPartial: false, confirmBelow: false } });'));
check('sending: POST /award with the explicit body; 202 (the owner decides) and the three kinds of re-post each have their own message', has("api('/api/quotes/' + encodeURIComponent(w.quoteId) + '/award', { method: 'POST', body: JSON.stringify(bkAwardBody(w, plan)) })") && has("r && r.approval ? 'apSent'") && has("r.repost.existing ? 'bkwAwardedRepostExisting' : r.repost.status === 'DRAFT' ? 'bkwAwardedRepostDraft' : 'bkwAwardedRepost'"));
check('when the answer changed under the buyer (409 with a code) the window looks again and asks for the confirmations again', has("if (e.status === 409 && e.data && e.data.code) {") && has("t('bkwChanged')"));
check('the window is above Compare bids and every other window, and the Back button closes it first', html.indexOf('html += renderAwardCheck() + renderBasketAward() + renderApprovalModal()') > html.indexOf("'confirmDeliveryFail()'") && html.indexOf("['bkAward', s => !!s.bkAward") < html.indexOf("['bkAnswer', s => !!s.bkAnswer"));
check('the owner\'s rules still apply: the approval note, the reason and the budget after the order are shown, the button says "send for approval"', has("t('acNeedsApproval')") && has("budgetAfterHtml(c);") && has("t(c.needsApproval ? 'acSend' : 'bkwAward')"));
check('names of the supplier, the items and the analogues are escaped in the window', has("esc(quote.supplierCompany ? quote.supplierCompany.name : '')") && has("esc(a.substituteName + (a.substituteBrand ? ' (' + a.substituteBrand + ')' : ''))") && has("esc(plan.missing.map((m) => m.name).join(', '))"));
const keys4 = Object.keys(en).filter((k) => /^bkw[A-Z]/.test(k));
check('every award text exists in English and Arabic (Arabic script, same placeholders)', keys4.length >= 18 && keys4.every((k) => typeof ar[k] === 'string' && /[؀-ۿ]/.test(ar[k]) && JSON.stringify((en[k].match(/\{\w+\}/g) || []).sort()) === JSON.stringify((ar[k].match(/\{\w+\}/g) || []).sort())), keys4.filter((k) => !ar[k]));

// ================= the order, what is missing, "Re-post RFQ" =================
const cardSrc = html.slice(html.indexOf('function bkOrderLinesCard(order, isSupplier){'), html.indexOf('// Close bidding early: no more quotes'));
const mkCard = (state) => new Function('state', 't', 'tpl', 'esc', 'jsAttr', 'bhdMoney', 'unitLabel', 'bkTitleText', 'i18nDict', cardSrc + '; return bkOrderLinesCard;')(state, (k) => en[k] || k, (k, v) => String(en[k]).replace(/\{(\w+)\}/g, (_, n) => (v[n] !== undefined ? v[n] : '{' + n + '}')), esc2, (s) => esc2("'" + s + "'"), (n) => Number(n).toFixed(3) + ' BHD', (u) => u, lib.bkTitleText, () => en);
function esc2(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const card = mkCard({ lang: 'en' });
const lines = [{ name: 'Flour', unit: 'kg', quantity: 50, unitPrice: '0.500', lineTotal: '25.000', isSubstitute: false }, { name: 'Oil <b>', unit: 'litre', quantity: 4, unitPrice: '3.200', lineTotal: '12.800', isSubstitute: true, substituteName: 'Other oil', substituteBrand: 'B' }];
const orderB = { lpo: { id: 'lpo-1', rfq: { isBasket: true }, items: lines }, missingItems: [{ name: 'Salt', quantity: 10, unit: 'kg' }], repost: { canRepost: true, reason: null, existing: null } };
const out1 = card(orderB, false);
check('a basket order shows its lines: name, quantity, unit price, line total, the analogue named under the item it replaced; names are escaped', out1.includes('Flour') && out1.includes('50 kg') && out1.includes('25.000 BHD') && out1.includes('Oil &lt;b&gt;') && !out1.includes('Oil <b>') && out1.includes('Analogue: Other oil (B)'), out1.slice(0, 200));
check('the buyer sees what is not in the order and "Re-post RFQ" (it opens the prefilled form), the supplier sees neither', out1.includes('Not in this order') && out1.includes('Salt (10 kg)') && out1.includes("openRepostBasket(&#39;lpo-1&#39;)") && out1.includes('Re-post RFQ') && !card(orderB, true).includes('Not in this order') && !card(orderB, true).includes('Re-post RFQ'));
check('a shortfall at delivery is explained as a dispute (buyer only)', out1.includes('handled as a dispute') && !card(orderB, true).includes('handled as a dispute'));
const out2 = card({ ...orderB, repost: { canRepost: false, reason: 'ALREADY_REPOSTED', existing: { id: 'r2', title: 'Basket · 1 item · missing items', status: 'PUBLISHED' } } }, false);
check('when the missing items were already posted again: no second button, a note with the new request\'s name (in the user\'s language) and "Open"', !out2.includes('Re-post RFQ') && out2.includes('Posted again as') && out2.includes('Basket · 1 item · missing items') && out2.includes('Open'));
check('an order that is no longer active says why nothing can be posted again; nothing missing = no box; a single-request order has no lines card', card({ ...orderB, repost: { canRepost: false, reason: 'LPO_NOT_ACTIVE', existing: null } }, false).includes('no longer active') && !card({ ...orderB, missingItems: [] }, false).includes('Not in this order') && card({ lpo: { rfq: { isBasket: false } } }, false) === '' && card({ lpo: { rfq: { isBasket: true } } }, false) === '' && card({}, false) === '');
check('the order page: the title in the user\'s language, "N of M items in this order" instead of a quantity, the lines card under the cards', has("esc(rfq ? rfqTitle(rfq) : t('lpoOrderFallback'))") && has("tpl('bkoItemsOf', { n: lpo.items.length, total: rfq && rfq.items ? rfq.items.length : lpo.items.length })") && has('bkOrderLinesCard(order, isSupplier) +'));
check('the lists of orders and purchase orders show the title in the user\'s language, and an order a pill with its number of lines', html.split('rfqTitle(l.rfq)').length - 1 >= 2 && has('rfqTitle(o.lpo.rfq)') && has('const linesPill ='));
check('"Re-post RFQ": GET /lpos/:id/repost fills the same basket form (items, name, category, a deadline as long as the first), the buyer reviews and posts it with repostOfLpoId; the order page refreshes', has("api('/api/lpos/' + encodeURIComponent(lpoId) + '/repost')") && has("if (!d.canRepost) { showToast(t('bkRepostNotAvailable')); return; }") && has('repostOfLpoId: lpoId,') && has("if (state.section === 'orderDetail' && state.selectedOrderId) openOrderDetail(state.selectedOrderId);"));
const keys5 = Object.keys(en).filter((k) => /^bko[A-Z]/.test(k));
check('every order text exists in English and Arabic (Arabic script, same placeholders)', keys5.length >= 14 && keys5.every((k) => typeof ar[k] === 'string' && /[؀-ۿ]/.test(ar[k]) && JSON.stringify((en[k].match(/\{\w+\}/g) || []).sort()) === JSON.stringify((ar[k].match(/\{\w+\}/g) || []).sort())), keys5.filter((k) => !ar[k]));

// ================= spending, CSV, price history, re-order =================
const an0 = html.indexOf('// BEGIN ANALYTICS HELPERS'), an1 = html.indexOf('// END ANALYTICS HELPERS');
const csvLib = new Function(html.slice(an0, an1) + '; return { buildSpendingCsv, csvCell };')();
const tr = (k) => ({ csvDate: 'Date', csvLpo: 'LPO', csvSupplier: 'Supplier', csvItem: 'Item', csvCategory: 'Category', csvQty: 'Qty', csvUnit: 'Unit', csvUnitPrice: 'Unit price', csvTotal: 'Total', csvPaid: 'Paid', csvInvoice: 'Invoice', csvAnalogue: 'analogue' }[k] || k);
const spendLines = [
  { orderId: 'o1', lpoId: 'aaaa1111', receivedDay: '2026-10-20', supplier: 'Wholesaler', title: 'Flour', category: 'Food', quantity: 50, unit: 'kg', unitPrice: '0.500', total: '25.000', invoiceStatus: 'ISSUED', paid: null, basket: true },
  { orderId: 'o1', lpoId: 'aaaa1111', receivedDay: '2026-10-20', supplier: 'Wholesaler', title: 'Tomato sauce', category: 'Food', quantity: 4, unit: 'litre', unitPrice: '3.200', total: '12.800', invoiceStatus: 'ISSUED', paid: null, basket: true, substitute: true, substituteName: 'Other sauce' },
  { orderId: 'o2', lpoId: 'bbbb2222', receivedDay: '2026-10-21', supplier: 'Single Co', title: 'Rice', category: 'Food', quantity: 10, unit: 'kg', unitPrice: '1.000', total: '10.000', invoiceStatus: 'PAID', paid: '10.000' },
];
const csv = csvLib.buildSpendingCsv(spendLines, tr, (s) => s).split('\r\n');
check('CSV: a basket line is a row with its own price and total, and the Paid cell is EMPTY (the payment belongs to the whole order); a single order still shows what was paid', csv[1].endsWith(',25.000,,ISSUED') && csv[1].includes(',Flour,') && csv[3].endsWith(',10.000,10.000,PAID'), csv.slice(0, 4));
check('CSV: an analogue line is written under the item it replaced, with the analogue named; nothing is added to the other lines', csv[2].includes('Tomato sauce (analogue: Other sauce)') && !csv[1].includes('analogue') && !csv[3].includes('analogue') && csv[0].split(',').length === 11 && csv[2].split(',').length === 11, csv[2]);
check('CSV: the analogue\'s name cannot start a formula (the cell is checked after it is built)', csvLib.buildSpendingCsv([{ ...spendLines[1], title: '=cmd', substituteName: '+x' }], tr, (s) => s).includes("'=cmd (analogue: +x)"));
check('the spending page says why Paid is empty for basket lines, only when there are such lines', has("(d.lines.some((l) => l.basket) ? '<div class=\"bx-noprint mb-4 max-w-[640px] text-[12px]\"") && has("t('spBasketNote')"));
check('price history: a basket\'s requests are marked and a note explains the prices (as asked; an analogue\'s price is another product\'s)', has("(r.isBasket ? ' <span class=\"rounded-full px-2 py-0.5 text-[10.5px] font-semibold\"") && has("(d.rfqs.some((r) => r.isBasket) ?") && has("t('prBasketNote')"));
check('"Re-order" is not offered for a basket order (the single-item form cannot hold a basket); the reminders still work per item', has("o.status === 'COMPLETED' && !(o.lpo && o.lpo.rfq && o.lpo.rfq.isBasket) ?"));
const keys6 = ['spBasketNote', 'csvAnalogue', 'prBasketTag', 'prBasketNote'];
check('the new spending texts exist in English and Arabic (Arabic script)', keys6.every((k) => typeof en[k] === 'string' && /[؀-ۿ]/.test(ar[k] || '')));

// ================= the admin console: documents waiting for review =================
const dn0 = html.indexOf('// BEGIN ADMIN DOCUMENT NOTICE HELPERS'), dn1 = html.indexOf('// END ADMIN DOCUMENT NOTICE HELPERS');
check('the notice helpers block is in index.html', dn0 > 0 && dn1 > dn0);
const dn = new Function(html.slice(dn0, dn1) + '; return { adminDocNoticeText, adminDocNoticeRows };')();
check('a row says how many documents and which kind came last (an unknown kind and missing data do not break it)', dn.adminDocNoticeText({ documents: 1, lastDocType: 'CR_CERTIFICATE' }) === '1 document · last: CR certificate' && dn.adminDocNoticeText({ documents: 3, lastDocType: 'TRADE_LICENSE' }) === '3 documents · last: Trade license' && dn.adminDocNoticeText({ documents: 2, lastDocType: 'WHAT' }) === '2 documents · last: Document' && dn.adminDocNoticeText(null) === '0 documents · last: Document');
const many = Array.from({ length: 9 }, (_, i) => ({ companyId: 'c' + i }));
check('the first five rows are shown, all of them on "Show all"; anything that is not a list gives no rows', dn.adminDocNoticeRows(many, false).length === 5 && dn.adminDocNoticeRows(many, true).length === 9 && dn.adminDocNoticeRows(many, false, 3).length === 3 && dn.adminDocNoticeRows(null, true).length === 0 && dn.adminDocNoticeRows(undefined, false).length === 0);
check('the list comes from GET /admin/document-notices, with the other admin data, and again after a verify or reject; it is dropped at sign-out', has("api('/api/admin/document-notices')") && has('function refreshAdmin(){ refreshAdminCompanies(); refreshAdminDisputes(); refreshAdminDocNotices(); }') && has('refreshAdminCompanies(); refreshAdminDocNotices();') && has('adminDocNotices:null, adminDocNoticesAll:false, adminRfqs:[],'));
check('it sits on top of the Companies tab for the real data only (never in the test area), shows nothing when nothing waits, and "Open" goes to that company\'s card', has("(state.adminTest ? '' : adminDocNoticesHtml()) +") && has("if (!d || !d.total) return '';") && has("onclick=\"openAdminCompany(' + jsAttr(n.companyId) + ')\""));
check('company names and statuses from the server are escaped', has('esc(n.companyName)') && has('esc(n.verificationStatus)') && has('esc(adminDocNoticeText(n))'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
