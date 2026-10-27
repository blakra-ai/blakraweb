/**
 * BLAKRA contact form endpoint (Google Apps Script web app).
 *
 * Deploy: Extensions → Apps Script in the Google account that owns the current
 * form, replace the script with this file, set the two properties below, then
 * Deploy → Manage deployments → edit the existing deployment → Version: New version.
 * Editing the existing deployment keeps the /exec URL the site already uses.
 *
 * Script properties (Project settings → Script properties):
 *   SHEET_ID      recommended: a Google Sheet id; every enquiry is saved here first
 *   NOTIFY_EMAIL  where enquiries are emailed, e.g. hello@blakra.us (first 40 a day)
 *
 * Stronger spam protection (optional): add Cloudflare Turnstile to the form and verify
 * its token here with UrlFetchApp before saving. The honeypot and timing below are
 * only a first filter, because the browser reports them.
 *
 * The site posts JSON as text/plain (a CORS simple request) and shows success only
 * when this script answers { ok: true }. Everything the browser checks is checked
 * again here, because the /exec URL is public.
 */

// mailPerDay stays well under a consumer account's MailApp quota (~100 recipients/day);
// enquiries past it are still saved to the Sheet, so a flood cannot erase real leads.
var LIMITS = { org: 120, email: 254, msgMin: 10, msg: 2000, minMs: 3000, mailPerDay: 40, perDay: 500 };
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var intent = ['commission', 'partner', 'invest'].indexOf(data.intent) >= 0 ? data.intent : 'commission';
    // Single-line fields lose control characters, so nobody can forge extra lines in the email.
    var line = function (v, max) { return String(v || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max); };
    var lang = line(data.lang || 'en', 5);
    var page = line(data.page || '/', 80);
    var org = line(data.org, 1000);
    var email = line(data.email, 1000);
    var msg = String(data.msg || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();

    // Bots: a filled honeypot or an instant submit. Answer ok so they learn nothing.
    if (data.website || Number(data.elapsed || 0) < LIMITS.minMs) return reply(true);

    if (!org || org.length > LIMITS.org) return reply(false, 'org');
    if (!email || email.length > LIMITS.email || !EMAIL.test(email)) return reply(false, 'email');
    if (msg.length < LIMITS.msgMin || msg.length > LIMITS.msg) return reply(false, 'msg');
    var count = countToday();
    if (count > LIMITS.perDay) return reply(false, 'busy');

    var props = PropertiesService.getScriptProperties();
    var to = props.getProperty('NOTIFY_EMAIL');
    var sheetId = props.getProperty('SHEET_ID');
    if (!to && !sheetId) return reply(false, 'error');

    // Save first: the Sheet is the record; email is the notification.
    if (sheetId) {
      // A leading apostrophe stops formula injection, in Sheets and in CSV exports opened in Excel.
      var safe = function (v) { return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };
      SpreadsheetApp.openById(sheetId).getSheets()[0].appendRow([new Date(), intent, safe(lang), safe(org), safe(email), safe(msg)]);
    }
    if (to && count <= LIMITS.mailPerDay) {
      MailApp.sendEmail({
        to: to,
        replyTo: email,
        subject: '[' + intent + '] ' + org.slice(0, 60),
        body: 'Intent: ' + intent + '\nFrom: ' + org + '\nEmail: ' + email + '\nLanguage: ' + lang + '\nPage: ' + page + '\n\n' + msg,
      });
    }
    return reply(true);
  } catch (err) {
    console.error(err && err.name);
    return reply(false, 'error');
  }
}

// Today's count in Script Properties (durable, unlike the cache); the previous day's key is replaced.
function countToday() {
  var props = PropertiesService.getScriptProperties();
  var day = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var saved = (props.getProperty('COUNT') || '').split(':');
    var count = (saved[0] === day ? Number(saved[1]) || 0 : 0) + 1;
    props.setProperty('COUNT', day + ':' + count);
    return count;
  } finally {
    lock.releaseLock();
  }
}

function reply(ok, error) {
  return ContentService.createTextOutput(JSON.stringify(ok ? { ok: true } : { ok: false, error: error }))
    .setMimeType(ContentService.MimeType.JSON);
}
