// Run: node test/product-icons.test.js   (no dependencies)
// The icon shown for a catalog item without a photo: its kind is guessed from the name (EN and AR), then brand, category and description.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

const a = html.indexOf('// BEGIN PRODUCT KINDS'), b = html.indexOf('// END PRODUCT KINDS');
check('the block is in index.html', a > 0 && b > a);
const ICON_BOX = '<path d="BOX"/>';
const lib = new Function('ICON_BOX', 't', html.slice(a, b) + '; return { productKind, productIconHtml, productIconBlockHtml, PRODUCT_KIND_ICON, PRODUCT_KIND_WORDS };')(ICON_BOX, (k) => '[' + k + ']');
const kind = (name, extra) => lib.productKind({ name, ...extra });

// English: each kind, and the cases where the specific rule has to win
const EN = {
  oil: ['Sunflower Oil 1.5L', 'Extra virgin olive oil', 'Palm oil 18L', 'Frying oil'],
  sack: ['Basmati Rice 5kg', 'Wheat flour 25kg', 'White sugar', 'Sea salt', 'Spaghetti No.5', 'Red lentils', 'Rolled oats', 'Yeast'],
  sauce: ['Tomato paste 800g', 'Ketchup', 'Mayonnaise 3.5L', 'Tahini', 'Black olives', 'Honey 1kg', 'Garlic sauce', 'Peanut butter', 'Canned chickpeas', 'Black pepper', 'Chicken stock cubes'],
  drink: ['Mineral water 0.5L', 'Orange juice', 'Pepsi 330ml can', 'Cola', 'Green tea bags', 'Coffee beans 1kg', 'Tomato juice', 'Lemon juice'],
  frozen: ['Frozen chicken breast', 'French fries 2.5kg', 'Vanilla ice cream', 'Frozen peas'],
  dairy: ['Full cream milk', 'Mozzarella cheese', 'Greek yoghurt', 'Butter 500g', 'Labneh', 'Cream cheese', 'Whipping cream'],
  meat: ['Chicken breast', 'Beef mince', 'Lamb shoulder', 'Beef burger patties', 'Salmon fillet', 'Shrimp 31/40'],
  produce: ['Tomatoes', 'Red onions', 'Potato', 'Fresh mint', 'Cucumber', 'Lemons', 'Bananas', 'Bell pepper'],
  cleaning: ['Dishwashing liquid', 'Hand soap', 'Bleach 4L', 'Floor cleaner', 'Laundry detergent', 'Sanitizer'],
  packaging: ['Paper cups 8oz', 'Cup lids', 'Napkins', 'Aluminium foil 30cm', 'Disposable gloves', 'Takeaway containers', 'Plastic spoons', 'Garbage bags', 'Cling film'],
  box: ['Mystery item', 'Item 12', 'xyz', '', 'Gift voucher'],
};
for (const [k, names] of Object.entries(EN)) for (const n of names) check('EN ' + k + ': ' + (n || '(empty)'), kind(n) === k, kind(n));

// Arabic, with the usual spelling variants (al-, ta marbuta, hamza, diacritics)
const AR = {
  oil: ['زيت عباد الشمس', 'زيت الزيتون', 'الزيوت النباتية'],
  sack: ['أرز بسمتي 5 كجم', 'طحين أبيض', 'السكر الأبيض', 'ملح طعام', 'معكرونة', 'عدس أحمر'],
  sauce: ['معجون طماطم', 'كاتشب', 'مايونيز', 'طحينة', 'زيتون أسود', 'عسل', 'صلصة الثوم'],
  drink: ['مياه معدنية', 'عصير برتقال', 'بيبسي', 'شاي أخضر', 'قهوة', 'عصير طماطم'],
  frozen: ['دجاج مجمد', 'بطاطس مقلية مجمدة', 'ايس كريم فانيلا'],
  dairy: ['حليب كامل الدسم', 'جبنة موزاريلا', 'لبن زبادي', 'الزبدة', 'لبنة', 'قشطة'],
  meat: ['صدور دجاج', 'لحم بقري مفروم', 'لحم غنم', 'سمك سلمون', 'جمبري'],
  produce: ['طماطم', 'بصل أحمر', 'بطاطس', 'نعناع طازج', 'خيار', 'ليمون'],
  cleaning: ['سائل جلي', 'صابون سائل', 'منظف أرضيات', 'مبيض كلور'],
  packaging: ['أكواب ورقية', 'مناديل', 'ورق ألمنيوم', 'قفازات', 'علبة سفري', 'ملاعق بلاستيك'],
  box: ['صنف غير معروف', 'منتج'],
};
for (const [k, names] of Object.entries(AR)) for (const n of names) check('AR ' + k + ': ' + n, kind(n) === k, kind(n));

// words inside longer words do not count; case and punctuation do not matter
check('"price", "boiled", "steak", "watermelon" are not rice, oil, tea, water', kind('Price list') === 'box' && kind('Boiled') === 'box' && kind('Steak') === 'meat' && kind('Watermelon') === 'produce');
check('case, hyphens and slashes: "TAKE-AWAY box", "Olive-OIL"', kind('TAKE-AWAY box') === 'packaging' && kind('Olive-OIL') === 'oil');
check('plural forms: "napkins", "lemons", "cheeses"', kind('Napkins') === 'packaging' && kind('Lemons') === 'produce' && kind('Cheeses') === 'dairy');

// the other fields are used only when the name says nothing
check('brand, category and description are tried after the name', kind('Item 1', { brand: 'Pepsi' }) === 'drink' && kind('Item 1', { category: 'Frozen Food' }) === 'frozen' && kind('Item 1', { description: 'cooking oil' }) === 'oil');
check('the name wins over the brand', kind('Olive oil', { brand: 'Pepsi' }) === 'oil');
check('the marketplace category matches nothing: "Restaurants & Cafés" alone is a box', kind('Item', { category: 'Restaurants & Cafés' }) === 'box');
check('an RFQ-style title works too', lib.productKind({ title: 'Basmati rice' }) === 'sack');
check('no item, odd values: a box, no crash', lib.productKind(null) === 'box' && lib.productKind({}) === 'box' && lib.productKind({ name: 42 }) === 'box' && lib.productKind({ name: '<script>' }) === 'box');

// the tile
const kinds = Object.keys(EN).filter((k) => k !== 'box');
check('every kind has an icon, and none of them is the box', kinds.every((k) => lib.PRODUCT_KIND_ICON[k] && lib.PRODUCT_KIND_ICON[k].startsWith('<path') || (lib.PRODUCT_KIND_ICON[k] || '').startsWith('<rect')));
check('every rule\'s kind has an icon', lib.PRODUCT_KIND_WORDS.every(([k]) => lib.PRODUCT_KIND_ICON[k]));
const tile = lib.productIconHtml({ name: 'Rice' }, 40);
check('the tile is an inline SVG, hidden from screen readers, not an image', tile.includes('<svg') && tile.includes('aria-hidden="true"') && !tile.includes('<img') && tile.includes('data-kind="sack"'));
check('...with a dashed border (a photo has a solid one) and theme colours only', tile.includes('dashed') && /var\(--sunken\)/.test(tile) && !/#[0-9a-fA-F]{3,6}/.test(tile) && tile.includes('width:40px'));
check('an unknown item gets the neutral box', lib.productIconHtml({ name: 'zzz' }, 36).includes('BOX'));
const block = lib.productIconBlockHtml({ name: 'Rice' });
check('the wide tile says "No photo" and is not clickable', block.includes('[noPhotoLabel]') && block.includes('dashed') && !block.includes('onclick') && !block.includes('<img'));
check('no emoji in the icons', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html.slice(a, b)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
