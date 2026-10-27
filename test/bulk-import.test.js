// Run: node test/bulk-import.test.js   (no dependencies)
// Catalog import from Excel/CSV: the price goes to the server as a number (the server accepts only a JSON number), whatever the file had
// in the cell; rows with no usable price never leave the preview.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };

const money = html.slice(html.indexOf('function parseMoneyInput(raw){'), html.indexOf('// server error texts are shown in Arabic'));
const src = html.slice(html.indexOf('function importPriceText(v){'), html.indexOf('// ---------- Catalog: bulk photo upload'))
  + html.slice(html.indexOf('function renderBulkImportResult(){'), html.indexOf('function renderBulkImportModal(){'));
const state = { lang: 'en', bulkImportRows: [], myCatalog: [] };
const calls = [], toasts = [];
let nextRaw = [];
const XLSX = { read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }), utils: { sheet_to_json: () => nextRaw } };
// by default every row is saved; `reply` lets a test answer with its own results (or throw)
let reply = null;
const api = async (url, opts) => {
  const body = JSON.parse(opts.body);
  calls.push({ url, body });
  if (reply) return reply(body, calls.length);
  return { results: body.items.map((_, index) => ({ index, ok: true })) };
};
const lib = new Function('state', 't', 'tpl', 'CATALOG_UNITS', 'loadSheetJS', 'showToast', 'setState', 'api', 'refreshMyCatalog', 'srvErr', 'esc',
  money + src + '; return { importPriceText, onBulkImportFileChange, submitBulkImport, renderBulkImportResult };')(
  state, (k) => '[' + k + ']', (k, v) => '[' + k + ':' + Object.entries(v).map(([a, b]) => a + '=' + b).join(',') + ']',
  ['kg', 'pcs', 'box', 'carton', 'litre', 'ton'], async () => XLSX, (m) => toasts.push(m), (p) => Object.assign(state, p), api, async () => {}, (m) => m, (x) => String(x).replace(/</g, '&lt;'));

const file = { name: 'cat.csv', arrayBuffer: async () => new ArrayBuffer(0) };
const load = async (raw) => { nextRaw = raw; await lib.onBulkImportFileChange({ target: { files: [file], value: 'x' } }); return state.bulkImportRows; };
const line = (n, price) => ({ name: 'Item ' + n, brand: 'B', unit: 'kg', category: '', description: '', price });

(async () => {
  // the price in the file: a number cell, text with a dot, text with a comma
  await load([line(1, 2.5), line(2, '2.500'), line(3, '2,500'), line(4, ' 12 ')]);
  await lib.submitBulkImport();
  const prices = calls[0].body.items.map((i) => i.price);
  check('a numeric cell, "2.500" and "2,500" all go to the server as the number 2.5', prices[0] === 2.5 && prices[1] === 2.5 && prices[2] === 2.5);
  check('every price in the request is a JSON number (not text), including a padded "12"', prices.every((p) => typeof p === 'number') && prices[3] === 12);
  check('the request goes to /api/catalog/bulk with the other fields as before', calls[0].url === '/api/catalog/bulk' && calls[0].body.items[0].name === 'Item 1' && calls[0].body.items[0].brand === 'B' && calls[0].body.items[0].unit === 'kg');

  // float noise from a numeric cell is rounded to 3 decimals; a real 4th decimal is not
  check('0.30000000000000004 -> 0.3, 2.0000000000000004 -> 2', lib.importPriceText(0.1 + 0.2) === '0.3' && lib.importPriceText(2.0000000000000004) === '2');
  check('a real extra decimal stays and is an error in the preview (2.0005, "2.0005")', lib.importPriceText(2.0005) === '2.0005' && (await load([line(1, 2.0005), line(2, '2.0005')])).every((r) => r._error));
  const rows = await load([line(1, 0.1 + 0.2)]);
  check('a numeric cell with float noise passes the preview', !rows[0]._error && rows[0].price === '0.3');

  // rows that cannot become a price never reach the request
  calls.length = 0;
  const bad = await load([line(1, ''), line(2, 'abc'), line(3, 0), line(4, '0'), line(5, '0,000'), line(6, -1), line(7, '1,234.500'), line(8, 3)]);
  check('empty, text, 0, negative and thousands-separated prices are errors in the preview', bad.slice(0, 7).every((r) => r._error) && !bad[7]._error);
  check('...and 0 has its own message', bad[2]._error === '[biErrPriceZero]' && bad[3]._error === '[biErrPriceZero]' && bad[4]._error === '[biErrPriceZero]');
  await lib.submitBulkImport();
  check('only the valid row is sent, with its price as a number', calls.length === 1 && calls[0].body.items.length === 1 && calls[0].body.items[0].price === 3);

  // the answer: which rows failed, as the row numbers of the file
  calls.length = 0; toasts.length = 0;
  await load([line(1, 'abc'), line(2, 2), line(3, 3), line(4, 4)]); // file row 2 is invalid in the preview; rows 3-5 are sent
  reply = () => ({ results: [{ index: 0, ok: true, item: {} }, { index: 1, ok: false, error: 'price is too large' }, { index: 2, ok: false, error: 'name required' }] });
  await lib.submitBulkImport();
  const res = state.bulkImportResult;
  check('failed rows are reported with the row number of the file (not the position in the request)', state.bulkImportStep === 'result' && res.ok === 1 && res.failed.length === 2 && res.failed[0].line === 4 && res.failed[1].line === 5 && res.failed[0].name === 'Item 3');
  const view = lib.renderBulkImportResult();
  check('the list shows "Row N — reason" for each and the totals', view.includes('[biFailRow:n=4,reason=price is too large]') && view.includes('[biFailRow:n=5,reason=name required]') && view.includes('[biResult:ok=1,failed=2]') && !toasts.length);

  // 12 failures: only the first 10, and the rest are counted
  await load(Array.from({ length: 12 }, (_, i) => line(i, 1)));
  reply = (body) => ({ results: body.items.map((_, index) => ({ index, ok: false, error: 'Could not save this row, please try again' })) });
  await lib.submitBulkImport();
  const view12 = lib.renderBulkImportResult();
  check('12 failures: 10 rows listed and "…and 2 more"', (view12.match(/biFailRow/g) || []).length === 10 && view12.includes('[biFailMore:n=2]') && view12.includes('n=11,') && !view12.includes('n=12,'));

  // everything saved: the toast and the modal closes
  reply = null; toasts.length = 0; state.showBulkImport = true;
  await load([line(1, 1), line(2, 2)]);
  await lib.submitBulkImport();
  check('all saved: toast with the count and the modal closes', toasts.length === 1 && toasts[0] === '[toastBulkAdded:ok=2]' && state.showBulkImport === false);

  // more than 200 rows: parts of 200 in a row, one summary, the row numbers stay right
  calls.length = 0; reply = (body, n) => ({ results: body.items.map((it, index) => (n === 2 && index === 5 ? { index, ok: false, error: 'price is too large' } : { index, ok: true })) });
  await load(Array.from({ length: 450 }, (_, i) => line(i, 1 + i)));
  await lib.submitBulkImport();
  check('450 rows -> 3 requests of 200, 200 and 50, in order', calls.length === 3 && calls.map((c) => c.body.items.length).join() === '200,200,50' && calls[1].body.items[0].name === 'Item 200' && calls[2].body.items[0].price === 401);
  check('...and one summary: 449 saved, the failure in part 2 (index 5) is file row 207 (item 205 + 2)', state.bulkImportResult.ok === 449 && state.bulkImportResult.failed.length === 1 && state.bulkImportResult.failed[0].line === 207 && state.bulkImportResult.failed[0].name === 'Item 205');

  // a request that fails
  calls.length = 0; toasts.length = 0; state.bulkImportStep = 'preview'; state.bulkImportResult = null;
  reply = () => { throw new Error('Network error'); };
  await load([line(1, 1)]);
  await lib.submitBulkImport();
  check('the first request fails: the preview stays with the error toast, nothing is reported as a result', state.bulkImportStep === 'preview' && state.bulkImportResult === null && toasts[0] === 'Network error' && state.bulkImportBusy === false);
  calls.length = 0;
  reply = (body, n) => { if (n === 2) throw new Error('Network error'); return { results: body.items.map((_, index) => ({ index, ok: true })) }; };
  await load(Array.from({ length: 250 }, (_, i) => line(i, 1)));
  await lib.submitBulkImport();
  check('a later part fails: 200 saved, the 50 left are reported as not saved with the error and their rows', state.bulkImportResult.ok === 200 && state.bulkImportResult.failed.length === 50 && state.bulkImportResult.failed[0].line === 202 && state.bulkImportResult.failed[0].error === 'Network error');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
