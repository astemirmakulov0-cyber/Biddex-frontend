// Run: node test/spend.test.js   (no dependencies)
// Spending control in the cabinet: the owner's approval of a bid, the monthly budget, the spending rules. The server decides everything;
// these checks keep the screens honest: who sees what, the texts in both languages, the wiring.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const has = (s) => html.includes(s);

// ---- the pure parts, extracted from index.html
const state = { user: { permissions: [] }, lang: 'en' };
const can = (a) => state.user.permissions.includes(a);
const I18N = { en: {} };
const t = (k) => '[' + k + ']';
const tpl = (k, v) => '[' + k + ':' + JSON.stringify(v) + ']';
const esc = (s) => String(s == null ? '' : s);
const src = html.slice(html.indexOf('const rfqApproval = '), html.indexOf('function approvalReviewButton(r)'));
const { rfqApproval, approvalPending, approvalNote } = new Function('can', 't', 'tpl', 'esc', src + '; return { rfqApproval, approvalPending, approvalNote };')(can, t, tpl, esc);

const rfq = (status, extra) => ({ id: 'r1', approval: status ? { id: 'a1', status, decisionReason: 'Too dear', ...extra } : undefined });
check('a request without an approval says nothing', approvalNote(rfq(null)) === '' && !approvalPending(rfq(null)));
state.user.permissions = ['quote.decide'];
check('a manager sees "Waiting for the owner\'s approval" while it waits', approvalPending(rfq('PENDING')) && approvalNote(rfq('PENDING')).includes('[apWaitingOwner]'));
state.user.permissions = ['quote.decide', 'order.approve'];
check('an owner sees "Waiting for your approval"', approvalNote(rfq('PENDING')).includes('[apWaitingYou]'));
check('a rejection shows the owner\'s reason; expired and failed say so; nothing else shows', approvalNote(rfq('REJECTED')).includes('"reason":"Too dear"') && approvalNote(rfq('EXPIRED')).includes('[apExpiredNote]') && approvalNote(rfq('FAILED')).includes('[apFailedNote]') && approvalNote(rfq('APPROVED')) === '' && !approvalPending(rfq('REJECTED')));

// ---- who sees and does what
check('the owner\'s review button and the waiting banner need the right to approve', has("return approvalPending(r) && can('order.approve')") && has("function approvalsWaitingBanner(rfqs){\n  if (!can('order.approve')) return '';"));
check('Home counts the waiting approvals for owners only', has("['attnApprovals', can('order.approve') ? rfqs.filter(approvalPending).length : 0"));
check('while a pick waits nobody picks, shortlists or rejects (Compare bids shows the note, Withdraw for the one who asked or an owner)', has("if (!evaluating || !can('quote.decide') || aprPending) return shortlisted;") && has('compareApprovalBanner(compareRfq) +') && has("(a.requestedBy && a.requestedBy.you) || can('order.approve')"));
check('picking a bid asks the server first (award-check) and shows the window only when a budget is set or the owner is needed; the answer 202 is "sent to the owner"', has("'/award-check'") && has('if (chk && (chk.needsApproval || chk.budget != null))') && has("t(r && r.approval ? 'apSent' : 'toastAwarded')"));
check('the window of the question and the owner\'s window are on top of every other window', html.indexOf('html += renderAwardCheck() + renderBasketAward() + renderApprovalModal()') > html.indexOf("'confirmDeliveryFail()'"));
check('the owner approves (after a question) or rejects with a required reason', has("kind === 'approve' && !confirm(") && has("kind === 'reject' && !(m.reason || '').trim()") && has("'/api/approvals/' + encodeURIComponent(m.id) + '/' + kind"));
check('the rules card is for owners and managers (staff never see it), the manager only reads, only owners save', has("if (state.view !== 'buyer' || !can('analytics.view')) return '';") && has('if (!d.canEdit) {') && has("method:'PUT'"));
check('the threshold and the "needs approval" box show only while teams are on (a single owner never waits for anybody)', has("(teamOn() ? field(t('srThreshold')") && has("(teamOn() ? '<label class=\"flex items-start gap-2.5"));
check('the budget bar is in Spending (from d.budget) and turns amber at 80% and red at 100%', has('const cards = budgetBarHtml(d.budget) +') && has("p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--pend)' : 'var(--acc)'"));
check('the bell: a request opens the approval, a budget message opens Spending', has('openNotifApproval(') && has('openNotifSpending(') && has('/^APPROVAL_(REQUESTED|REMINDER)$/'));
check('#/approval/<id> (the e-mail button) opens the owner\'s window; signed out it waits for sign-in; anybody else lands on Home', has("m[1] === 'approval' && m[2]") && has("r.section === 'approvalLink' && r.approvalId") && has("r.section === 'approvalLink' || r.section === 'reorderLink') openAuth('BUYER', 'login')") && has("(['order', 'rfq', 'approval', 'reorder', 'login', 'register']"));
check('signing out forgets the windows and the rules', has('return { reorder:null, reorderAll:false, approvalModal:null, awardCheck:null, spendRules:null, spendForm:null,'));
check('the history has texts for the four approval actions', ['APPROVAL_REQUESTED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'APPROVAL_CANCELLED'].every((a) => has('act_' + a + ':')));

// ---- texts in both languages
const en = html.slice(html.indexOf('en: {'), html.indexOf('ar: {')), ar = html.slice(html.indexOf('ar: {'));
const val = (b, k) => { const m = new RegExp('\\b' + k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(b); return m ? m[1] : ''; };
const ph = (x) => (x.match(/\{\w+\}/g) || []).sort().join(',');
const keys = [...new Set([...en.matchAll(/\b((?:ap|ac|sr|sb)[A-Z]\w*|apSt_\w+|attnApprovals|ntOpenSpending|act_APPROVAL_\w+):/g)].map((m) => m[1]))];
check('every new text (ap*, ac*, sr*, sb*, act_APPROVAL_*) exists in English and Arabic with the same placeholders', keys.length > 60 && keys.every((k) => val(en, k) && /[؀-ۿ]/.test(val(ar, k)) && ph(val(en, k)) === ph(val(ar, k))));
check('the agreed label texts', val(en, 'apWaitingOwner') === "Waiting for the owner's approval" && val(en, 'apApprove') === 'Approve and send to supplier');
check('the dialog for approvals names the six states', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'FAILED'].every((s) => val(en, 'apSt_' + s) && val(ar, 'apSt_' + s)));

// ---- server errors
const sw = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'server-errors.js'), 'utf8'))(sw);
const arabic = (s) => /[؀-ۿ]/.test(s);
for (const e of ["This request is already waiting for the owner's approval", 'This approval request was already decided or is no longer open', 'This approval request has expired', 'Approval request not found', 'Set a monthly budget first', 'This quote can no longer be awarded', 'Cannot award an RFQ in CANCELLED status', 'reason is required', 'approvalThreshold must be a positive number', 'monthlyBudget can have at most 3 decimal places']) {
  check('Arabic for the server text: ' + e, arabic(sw.serverError(e, 'ar')) && sw.serverError(e, 'en') === e);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
