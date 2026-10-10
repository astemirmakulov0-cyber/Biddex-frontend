// Run: node test/rfq-list.test.js   (no dependencies)
// "Your RFQs": no countdown on a closed request, an awarded one shows its order (or that the supplier has not answered), a declined purchase
// order keeps the request Active with "choose another bid", Active / Finished tabs. Data comes from state.lpos (GET /lpos), no backend change.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };

const src = html.slice(html.indexOf('function rfqLpoOf(r)'), html.indexOf('function rfqFollowUpNote(r)'));
const isOrderClosed = (o) => o.status === 'COMPLETED' || o.status === 'CANCELLED';
const state = { lpos: [] };
const { rfqFollowUp, rfqIsFinished, rfqTabOf, rfqHasTimer } = new Function('state', 'isOrderClosed', src + '; return { rfqFollowUp, rfqIsFinished, rfqTabOf, rfqHasTimer };')(state, isOrderClosed);

const rfq = (status, id = 'r1') => ({ id, status });
const lpo = (status, rfqId = 'r1', order) => ({ id: 'l-' + status + rfqId, rfqId, status, order });

check('timer only while bidding can still happen (draft, published)', rfqHasTimer(rfq('DRAFT')) && rfqHasTimer(rfq('PUBLISHED')) && ['QUOTING_CLOSED', 'AWARDED', 'CANCELLED'].every((s) => !rfqHasTimer(rfq(s))));

state.lpos = [lpo('ACCEPTED', 'r1', { id: 'o1', status: 'COMPLETED' })];
let f = rfqFollowUp(rfq('AWARDED'));
check('awarded + accepted purchase order: the order is shown (link to it)', f && f.kind === 'order' && f.order.id === 'o1');
check('...a completed order makes the request Finished', rfqIsFinished(rfq('AWARDED')) && rfqTabOf(rfq('AWARDED')) === 'finished');
state.lpos = [lpo('ACCEPTED', 'r1', { id: 'o1', status: 'SHIPPED' })];
check('...an order still in progress keeps it Active', rfqFollowUp(rfq('AWARDED')).kind === 'order' && rfqTabOf(rfq('AWARDED')) === 'active');
state.lpos = [lpo('ACCEPTED', 'r1', { id: 'o1', status: 'CANCELLED' })];
check('...a cancelled order is Finished too', rfqTabOf(rfq('AWARDED')) === 'finished');

state.lpos = [lpo('ISSUED')];
check('awarded, the supplier has not answered yet: "awaiting supplier", Active', rfqFollowUp(rfq('AWARDED')).kind === 'waiting' && rfqTabOf(rfq('AWARDED')) === 'active');
state.lpos = [];
check('awarded but the purchase orders are not loaded yet: nothing special, Active (never wrongly Finished)', rfqFollowUp(rfq('AWARDED')) === null && rfqTabOf(rfq('AWARDED')) === 'active');

state.lpos = [lpo('DECLINED')];
check('the supplier declined (the server put the request back to QUOTING_CLOSED): "choose another bid", Active', rfqFollowUp(rfq('QUOTING_CLOSED')).kind === 'declined' && rfqTabOf(rfq('QUOTING_CLOSED')) === 'active');
check('...a declined purchase order says nothing about a request that is not QUOTING_CLOSED', rfqFollowUp(rfq('PUBLISHED')) === null && rfqFollowUp(rfq('CANCELLED')) === null);
state.lpos = [lpo('DECLINED'), lpo('ISSUED')];
check('after the buyer awarded another bid the new purchase order wins over the old declined one', rfqFollowUp(rfq('AWARDED')).kind === 'waiting' && rfqFollowUp(rfq('QUOTING_CLOSED')) === null);
state.lpos = [lpo('DECLINED', 'other')];
check('a purchase order of another request is never used', rfqFollowUp(rfq('QUOTING_CLOSED')) === null);

check('cancelled is Finished, a closed-for-bids request is Active (the buyer still has to choose)', rfqTabOf(rfq('CANCELLED')) === 'finished' && rfqTabOf(rfq('QUOTING_CLOSED')) === 'active' && rfqTabOf(rfq('PUBLISHED')) === 'active' && rfqTabOf(rfq('DRAFT')) === 'active');

// the screens
check('the table and the phone card show "—" instead of a countdown on a closed request (no data-deadline, so nothing ticks)', (html.match(/rfqHasTimer\(r\) \?/g) || []).length === 2);
check('the declined note is under the title in the table and in the card; the existing Compare bids button is kept', (html.match(/rfqFollowUpNote\(r\)/g) || []).length === 3 && /\(rfqBidCount\(r\) > 0 && r\.status !== 'CANCELLED' && !\(r\.status === 'AWARDED'/.test(html));
check('a phone card of an awarded request opens its order; a cancelled one opens nothing', /f\.kind === 'order'\) return "openOrderDetail\('"/.test(html) && /if \(r\.status === 'CANCELLED'\) return null;/.test(html));
check('the page has the two tabs and lists only the open tab', /rfqTabsHtml\(rfqs\)/.test(html) && /rfqTabOf\(r\) === state\.rfqTab/.test(html) && /rfqTab: 'active'/.test(html));
check('a link to a request opens the tab it is in', /state\.rfqTab = rfqTabOf\(rfq\)/.test(html));

const en = html.slice(html.indexOf('en: {'), html.indexOf('ar: {')), ar = html.slice(html.indexOf('ar: {'));
const val = (b, k) => { const m = new RegExp('\\b' + k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(b); return m ? m[1] : ''; };
const ph = (x) => (x.match(/\{\w+\}/g) || []).sort().join(',');
const keys = ['rfqTabActive', 'rfqTabFinished', 'rfqNoFinished', 'rfqNoActive', 'rfqOrderStatus', 'rfqAwaitingSupplier', 'rfqSupplierDeclined'];
check('the new texts exist in English and Arabic (Arabic script, same placeholders)', keys.every((k) => val(en, k) && /[؀-ۿ]/.test(val(ar, k)) && ph(val(en, k)) === ph(val(ar, k))));
check('the declined text is the agreed one', val(en, 'rfqSupplierDeclined') === 'Supplier declined — choose another bid');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
