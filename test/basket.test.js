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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
