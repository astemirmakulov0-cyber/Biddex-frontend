// Run: node test/bulk-import.test.js   (no dependencies)
// Catalog import from Excel/CSV: the price goes to the server as a number (the server accepts only a JSON number), whatever the file had
// in the cell; rows with no usable price never leave the preview.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };

const money = html.slice(html.indexOf('function parseMoneyInput(raw){'), html.indexOf('// server error texts are shown in Arabic'));
const src = html.slice(html.indexOf('function importPriceText(v){'), html.indexOf('// ---------- Catalog: bulk photo upload'));
const state = { lang: 'en', bulkImportRows: [], myCatalog: [] };
const calls = [], toasts = [];
let nextRaw = [];
const XLSX = { read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }), utils: { sheet_to_json: () => nextRaw } };
const api = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return { results: JSON.parse(opts.body).items.map((_, index) => ({ index, ok: true })) }; };
const lib = new Function('state', 't', 'tpl', 'CATALOG_UNITS', 'loadSheetJS', 'showToast', 'setState', 'api', 'refreshMyCatalog', 'srvErr',
  money + src + '; return { importPriceText, onBulkImportFileChange, submitBulkImport };')(
  state, (k) => '[' + k + ']', (k, v) => '[' + k + ':' + Object.entries(v).map(([a, b]) => a + '=' + b).join(',') + ']',
  ['kg', 'pcs', 'box', 'carton', 'litre', 'ton'], async () => XLSX, (m) => toasts.push(m), (p) => Object.assign(state, p), api, async () => {}, (m) => m);

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

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
