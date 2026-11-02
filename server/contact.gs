/**
 * BLAKRA contact form endpoint (Google Apps Script web app).
 *
 * Deploy: Extensions → Apps Script in the Google account that owns the current
 * form, replace the script with this file, set the two properties below, then
 * Deploy → Manage deployments → edit the existing deployment → Version: New version.
 * Editing the existing deployment keeps the /exec URL the site already uses.
 *
 * Script properties (Project settings → Script properties):
 *   SHEET_ID      a Google Sheet id; every enquiry is saved here first. Use a new Sheet for
 *                 this version (columns: time, intent, language, page (kept empty since 2026-11-02), from, email, message,
 *                 mailed). Without one, enquiries past the daily mail cap cannot be kept.
 *   NOTIFY_EMAIL  where enquiries are emailed, e.g. hello@blakra.us
 *
 * Retention: add a second trigger that runs `purge` daily. It deletes Sheet rows older than
 * 12 months (the Privacy page's period). Mails in the inbox are deleted by hand on the same schedule.
 *
 * Trigger (Triggers → Add trigger): run `digest`, time-driven, every hour. It mails the
 * enquiries that were saved but not mailed (past the daily mail cap, or a mail error), so a
 * flood can delay a notification by at most an hour and never drops an enquiry.
 *
 * Stronger spam protection (optional): add Cloudflare Turnstile to the form and verify
 * its token here with UrlFetchApp before saving. The honeypot and timing below are
 * only a first filter, because the browser reports them.
 *
 * The site posts JSON as text/plain (a CORS simple request) and shows success only
 * when this script answers { ok: true }. Everything the browser checks is checked
 * again here, because the /exec URL is public.
 */

// Volume never rejects an enquiry: every valid one is saved. Only the instant mails are
// capped (a consumer account's MailApp quota is about 100 recipients a day); the hourly
// digest covers the rest with one mail.
var RETAIN_DAYS = 365;
var LIMITS = { org: 120, email: 254, msgMin: 10, msg: 2000, minMs: 3000, mailPerDay: 40, digestRows: 50 };
// No spaces, quotes, brackets, commas, angle brackets or invisible characters: one plain address,
// never a list, a display name or text that reads backwards.
var EMAIL = /^[^\s@<>()[\]\\,;:"\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+@[^\s@<>()[\]\\,;:"\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+\.[^\s@<>()[\]\\,;:".\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]{2,}$/;
// C1 controls, zero-width, line/paragraph separators and bidi controls: never kept.
var INVISIBLE = /[\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;
var BANNER = 'Untrusted website submission. Check links and attachments before acting on them.';
// Sheet columns: time, intent, language, page, from, email, message, mailed ('' waiting,
// 'sending' while doPost mails it, 'yes' mailed at once, 'digest' mailed by the digest).
var MAILED_COLUMN = 8;
// A row still 'sending' after this long was never confirmed: the digest takes it.
var SENDING_MS = 10 * 60 * 1000;

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var intent = ['commission', 'partner', 'invest'].indexOf(data.intent) >= 0 ? data.intent : 'commission';
    // Single-line fields lose control characters, so nobody can forge extra lines in the email.
    var line = function (v, max) { return String(v || '').replace(INVISIBLE, '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max); };
    var lang = line(data.lang || 'en', 5);
    // The page path is not collected (data minimisation, 2026-11-02); its column stays for older Sheets.
    var page = '';
    var org = line(data.org, 1000);
    var email = line(data.email, 1000);
    var msg = String(data.msg || '').replace(/[\u2028\u2029]/g, '\n').replace(INVISIBLE, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();

    // Bots: a filled honeypot or an instant submit. Answer ok so they learn nothing.
    if (data.website || Number(data.elapsed || 0) < LIMITS.minMs) return reply(true);

    if (!org || org.length > LIMITS.org) return reply(false, 'org');
    if (!email || email.length > LIMITS.email || !EMAIL.test(email)) return reply(false, 'email');
    if (msg.length < LIMITS.msgMin || msg.length > LIMITS.msg) return reply(false, 'msg');

    var props = PropertiesService.getScriptProperties();
    var to = props.getProperty('NOTIFY_EMAIL');
    var sheetId = props.getProperty('SHEET_ID');
    if (!to && !sheetId) return reply(false, 'error');

    // The Sheet is the record: the row is saved before anything is mailed. Once it is saved the
    // visitor hears ok, whatever the mail does; a failure then would only make them send it again.
    // Under the daily cap it is mailed at once; the row says so from the start ('sending'), so the
    // digest never mails it a second time. If the counter's lock times out, the digest mails it.
    var mailNow = false;
    try {
      mailNow = Boolean(to) && countToday() <= LIMITS.mailPerDay;
    } catch (err) {
      console.error(err && err.name);
    }
    var sheet = null;
    var row = 0;
    if (sheetId) {
      sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        sheet.appendRow([new Date(), intent, safe(lang), safe(page), safe(org), safe(email), safe(msg), mailNow ? 'sending' : '']);
        row = sheet.getLastRow();
      } finally {
        lock.releaseLock();
      }
    }
    if (mailNow) {
      var mailed = false;
      try {
        MailApp.sendEmail({ to: to, replyTo: email, subject: subjectFor(intent), body: BANNER + '\n\n' + describe([new Date(), intent, lang, page, org, email, msg]) });
        mailed = true;
      } catch (err) {
        console.error(err && err.name);
      }
      if (!row) return mailed ? reply(true) : reply(false, 'error');
      try {
        // Not mailed: back to waiting, for the hourly digest.
        sheet.getRange(row, MAILED_COLUMN).setValue(mailed ? 'yes' : '');
      } catch (err) {
        console.error(err && err.name);
      }
    }
    return row ? reply(true) : reply(false, 'error');
  } catch (err) {
    console.error(err && err.name);
    return reply(false, 'error');
  }
}

/** Hourly (time-driven trigger): one mail listing the saved enquiries nobody was told about yet. */
function digest() {
  var props = PropertiesService.getScriptProperties();
  var to = props.getProperty('NOTIFY_EMAIL');
  var sheetId = props.getProperty('SHEET_ID');
  if (!to || !sheetId) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    var last = sheet.getLastRow();
    // Only the rows added since the last digest are read, so a large Sheet stays quick.
    var first = Math.max(1, Number(props.getProperty('DIGESTED') || 0) + 1);
    if (last < first) return;
    var rows = sheet.getRange(first, 1, last - first + 1, MAILED_COLUMN).getValues();
    var now = Date.now();
    var pending = [];
    // The next digest starts at the first row this one leaves open: one still being mailed by
    // doPost, or one past this mail's limit.
    var settled = rows.length;
    for (var i = 0; i < rows.length; i++) {
      // Rows with a time in the first column are enquiries; a header row or a mailed row is skipped.
      if (!(rows[i][0] instanceof Date)) continue;
      var mark = rows[i][MAILED_COLUMN - 1];
      var stale = mark === 'sending' && now - rows[i][0].getTime() > SENDING_MS;
      if (mark === 'sending' && !stale) settled = Math.min(settled, i);
      else if (!mark || stale) {
        if (pending.length < LIMITS.digestRows) pending.push(i);
        else settled = Math.min(settled, i);
      }
    }
    if (pending.length) {
      var parts = pending.map(function (i) { return describe(rows[i]); });
      var waiting = settled < rows.length ? '\n\nMore are waiting; the next digest sends them.' : '';
      MailApp.sendEmail({
        to: to,
        subject: '[blakra.us] ' + pending.length + ' enquiries not yet mailed',
        body: BANNER + '\n\n' + parts.join('\n\n---\n\n') + waiting,
      });
      // One write for the whole column; only the rows in this mail are marked.
      var marks = rows.map(function (r, i) { return [pending.indexOf(i) >= 0 ? 'digest' : r[MAILED_COLUMN - 1]]; });
      sheet.getRange(first, MAILED_COLUMN, rows.length, 1).setValues(marks);
    }
    props.setProperty('DIGESTED', String(first + settled - 1));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Daily (time-driven trigger): deletes enquiries older than RETAIN_DAYS from the Sheet. Rows are
 * appended in time order, so the old ones are one block after the optional header row.
 */
function purge() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!sheetId) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    var last = sheet.getLastRow();
    if (last < 1) return;
    var times = sheet.getRange(1, 1, last, 1).getValues();
    var cutoff = Date.now() - RETAIN_DAYS * 24 * 3600 * 1000;
    var start = 0;
    var n = 0;
    for (var i = 0; i < times.length; i++) {
      var t = times[i][0];
      if (!(t instanceof Date)) {
        if (n) break;
        continue;
      }
      if (t.getTime() >= cutoff) break;
      if (!n) start = i + 1;
      n++;
    }
    if (!n) return;
    sheet.deleteRows(start, n);
    var digested = Number(props.getProperty('DIGESTED') || 0);
    if (digested >= start) props.setProperty('DIGESTED', String(Math.max(start - 1, digested - n)));
  } finally {
    lock.releaseLock();
  }
}

/** A fixed subject: nothing a visitor typed, so the inbox never shows their wording as ours. */
function subjectFor(intent) {
  return '[blakra.us] ' + intent + ' enquiry';
}

// The visitor's message is quoted line by line, so nothing in it can pass for a header line
// or for another enquiry in the digest.
function describe(row) {
  var quoted = String(row[6]).split('\n').map(function (l) { return '> ' + l; }).join('\n');
  return 'Time: ' + row[0] + '\nIntent: ' + row[1] + '\nLanguage: ' + row[2] + (row[3] ? '\nPage: ' + row[3] : '') + '\nFrom: ' + row[4] + '\nEmail: ' + row[5] + '\n\n' + quoted;
}

// A value that a spreadsheet would read as a formula gets a visible prefix. Sheets hides a
// leading apostrophe and drops it on export, so a CSV opened in Excel would run the formula;
// U+2019 stays in the value, in Sheets, in the CSV and in Excel.
var MARK = '’';
function safe(v) { return /^[=+\-@\t\r]/.test(v) ? MARK + v : v; }

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
