const { pool } = require('../db');

const ICLOUD_CALDAV_BASE = 'https://caldav.icloud.com';

function basicAuth(appleId, password) {
  return 'Basic ' + Buffer.from(`${appleId}:${password}`).toString('base64');
}

// CalDAV fetch — follows redirects manually so PROPFIND/REPORT methods are preserved
async function caldavFetch(url, method, body, appleId, password, depth) {
  const headers = {
    'Authorization': basicAuth(appleId, password),
    'Content-Type': 'text/xml; charset=UTF-8',
  };
  if (depth !== undefined) headers['Depth'] = String(depth);

  let currentUrl = url;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(currentUrl, { method, headers, body, redirect: 'manual' });
    if ([301, 302, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('Redirect with no Location header');
      currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).href;
      continue;
    }
    return { res, finalUrl: currentUrl };
  }
  throw new Error('Too many redirects from iCloud CalDAV');
}

// Extract text content of first matching XML element (namespace-agnostic)
function extractElement(xml, tagName) {
  const re = new RegExp(`<(?:[^:>]+:)?${tagName}[\\s>][\\s\\S]*?>(([\\s\\S]*?))<\\/(?:[^:>]+:)?${tagName}>`, 'i');
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tagName}>`, 'i'));
  return m ? m[1].trim() : null;
}

// Extract the first <href> inside a named element
function extractHrefIn(xml, parentTagName) {
  const parent = extractElement(xml, parentTagName);
  if (!parent) return null;
  const m = parent.match(/<(?:[^:>]+:)?href[^>]*>([^<]+)<\/(?:[^:>]+:)?href>/i);
  return m ? m[1].trim() : null;
}

// ── ICS parsing ───────────────────────────────────────────────────────────────

// Unfold RFC 5545 folded lines (CRLF + whitespace = line continuation)
function unfoldICS(ics) {
  return ics.replace(/\r?\n[ \t]/g, '');
}

// Get a property value from an ICS block (handles ;PARAM=value parameters)
function getICSProp(block, propName) {
  const re = new RegExp(`^${propName}(?:;[^:]+)?:(.+)$`, 'mi');
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

// Unescape RFC 5545 text escape sequences
function unescapeICS(value) {
  if (!value) return value;
  return value
    .replace(/\\n/gi, '\n') // literal \n → newline
    .replace(/\\,/g, ',')   // \, → ,
    .replace(/\\;/g, ';')   // \; → ;
    .replace(/\\\\/g, '\\'); // \\ → \
}

// For location: collapse newlines into ", " for clean single-line display
function unescapeLocation(value) {
  return unescapeICS(value)?.replace(/\n+/g, ', ').trim() || null;
}

// Parse DTSTART/DTEND string → { date: 'YYYY-MM-DD', time: 'HH:MM' | null }
function parseDT(value) {
  if (!value) return { date: null, time: null };
  const v = value.replace(/Z$/, '');
  if (v.length === 8) {
    return { date: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`, time: null };
  }
  if (v.length >= 15 && v[8] === 'T') {
    return {
      date: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`,
      time: `${v.slice(9,11)}:${v.slice(11,13)}`,
    };
  }
  return { date: null, time: null };
}

// Extract all VEVENTs from an ICS string
function parseVEvents(icsStr) {
  const unfolded = unfoldICS(icsStr);
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1).map(b => b.split('END:VEVENT')[0]);
  const events = [];
  for (const block of blocks) {
    const uid     = getICSProp(block, 'UID');
    const summary = getICSProp(block, 'SUMMARY') || '(No title)';
    const dtstart = getICSProp(block, 'DTSTART');
    const status  = getICSProp(block, 'STATUS');
    if (!uid || !dtstart || status === 'CANCELLED') continue;
    const { date, time } = parseDT(dtstart);
    if (!date) continue;
    const dtend = getICSProp(block, 'DTEND');
    const { time: endTime } = parseDT(dtend);
    const notes    = unescapeICS(getICSProp(block, 'DESCRIPTION')) || null;
    const url      = getICSProp(block, 'URL') || null;
    const location = unescapeLocation(getICSProp(block, 'LOCATION'));
    events.push({ uid, summary, date, time, endTime: endTime || null, notes, url, location });
  }
  return events;
}

// ── Discovery ─────────────────────────────────────────────────────────────────

// Discover all VEVENT-capable calendars for the given Apple ID + app-specific password.
// Returns [{ url, name }]
async function discoverCalendars(appleId, password) {
  // Step 1 — current-user-principal
  const { res: r1 } = await caldavFetch(
    ICLOUD_CALDAV_BASE, 'PROPFIND',
    `<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop></d:propfind>`,
    appleId, password, 0
  );
  const xml1 = await r1.text();
  if (r1.status !== 207) {
    throw new Error(`iCloud authentication failed (${r1.status}) — check your Apple ID and app-specific password`);
  }

  const principalHref = extractHrefIn(xml1, 'current-user-principal');
  if (!principalHref) throw new Error('Could not find iCloud principal URL — ensure 2FA is enabled on your Apple ID');
  const principalUrl = principalHref.startsWith('http') ? principalHref : `${ICLOUD_CALDAV_BASE}${principalHref}`;

  // Step 2 — calendar-home-set
  const { res: r2 } = await caldavFetch(
    principalUrl, 'PROPFIND',
    `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
  <d:prop><cal:calendar-home-set/></d:prop></d:propfind>`,
    appleId, password, 0
  );
  const xml2 = await r2.text();

  const homeHref = extractHrefIn(xml2, 'calendar-home-set');
  if (!homeHref) throw new Error('Could not find iCloud calendar home');
  // iCloud returns absolute URL (https://p12-caldav.icloud.com/...) here
  const homeUrl = homeHref.startsWith('http') ? homeHref : `${ICLOUD_CALDAV_BASE}${homeHref}`;

  // Step 3 — list calendars
  const { res: r3 } = await caldavFetch(
    homeUrl, 'PROPFIND',
    `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <cal:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`,
    appleId, password, 1
  );
  const xml3 = await r3.text();

  const calendars = [];
  // Split on response elements
  const responseBlocks = xml3.split(/<(?:[^:>]+:)?response[^>]*>/).slice(1);
  for (const block of responseBlocks) {
    if (block.includes('404')) continue;
    if (!block.toUpperCase().includes('VEVENT')) continue;

    const hrefM = block.match(/<(?:[^:>]+:)?href[^>]*>([^<]+)<\/(?:[^:>]+:)?href>/i);
    if (!hrefM) continue;
    const href = hrefM[1].trim();

    const nameM = block.match(/<(?:[^:>]+:)?displayname[^>]*>([^<]+)<\/(?:[^:>]+:)?displayname>/i);
    const name = nameM ? nameM[1].trim() : '';
    if (!name) continue; // skip the home URL itself (no displayname)

    const calUrl = href.startsWith('http') ? href : new URL(href, homeUrl).href;
    calendars.push({ url: calUrl, name });
  }

  if (calendars.length === 0) throw new Error('No calendars found in this iCloud account');
  return calendars;
}

// ── Sync iCloud → DB ──────────────────────────────────────────────────────────

async function syncFromIcloud(connection) {
  const appleId     = connection.access_token;
  const password    = connection.refresh_token;
  const calendarUrl = connection.calendar_id;

  const since = new Date(); since.setDate(since.getDate() - 60);
  const until = new Date(); until.setDate(until.getDate() + 180);
  const toDT = d => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const { res } = await caldavFetch(
    calendarUrl, 'REPORT',
    `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${toDT(since)}" end="${toDT(until)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`,
    appleId, password, 1
  );

  const xml = await res.text();

  // Extract all <calendar-data> ICS blocks from the XML response
  const icsBlocks = [];
  const re = /<(?:[^:>]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?calendar-data>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const ics = m[1]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .trim();
    if (ics) icsBlocks.push(ics);
  }

  let synced = 0;
  for (const icsStr of icsBlocks) {
    for (const event of parseVEvents(icsStr)) {
      try {
        await pool.query(
          `INSERT INTO calendar_events
             (family_id, member_id, date, title, time, end_time, color, icon, external_id, provider, notes, url, location)
           VALUES ($1,$2,$3,$4,$5,$6,'gray','🍎',$7,'icloud',$8,$9,$10)
           ON CONFLICT (family_id, external_id, provider) WHERE external_id IS NOT NULL
           DO UPDATE SET title=$4, date=$3, time=$5, end_time=$6, notes=$8, url=$9, location=$10`,
          [connection.family_id, connection.member_id,
           event.date, event.summary, event.time, event.endTime, event.uid, event.notes, event.url, event.location]
        );
        synced++;
      } catch (err) {
        console.error('[icloud sync] upsert error:', err.message);
      }
    }
  }

  return { synced };
}

// ── Push local event → iCloud ─────────────────────────────────────────────────

// Parse a display time string like "12:27 PM" or "12:27 PM–1:27 PM" → "1227" (HHMM, 24h)
function parseDisplayTimeToHHMM(timeStr) {
  if (!timeStr) return null;
  const part = timeStr.split('–')[0].trim();
  const m = part.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2] || '0');
  const ampm = m[3].toUpperCase();
  if (ampm === 'AM' && h === 12) h = 0;
  if (ampm === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}${min.toString().padStart(2, '0')}`;
}

async function pushEventToIcloud(connection, event) {
  const appleId     = connection.access_token;
  const password    = connection.refresh_token;
  const calendarUrl = connection.calendar_id;

  const uid   = `aeramea-${event.id}-${Date.now()}@aeramea.com`;
  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const hhmm  = parseDisplayTimeToHHMM(event.time);
  // Use floating time (no Z, no TZID) so the calendar app treats it as local time
  const dtPart = hhmm
    ? `DTSTART:${event.date.replace(/-/g,'')}T${hhmm}00\r\nDTEND:${event.date.replace(/-/g,'')}T${hhmm}00`
    : `DTSTART;VALUE=DATE:${event.date.replace(/-/g,'')}\r\nDTEND;VALUE=DATE:${event.date.replace(/-/g,'')}`;

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aeramea//Family Hub//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${stamp}`,
    dtPart,
    `SUMMARY:${event.title}`,
  ];
  if (event.notes) lines.push(`DESCRIPTION:${event.notes.replace(/\n/g, '\\n')}`);
  if (event.url)   lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  const ics = lines.join('\r\n');

  const res = await fetch(`${calendarUrl}${uid}.ics`, {
    method: 'PUT',
    headers: { 'Authorization': basicAuth(appleId, password), 'Content-Type': 'text/calendar; charset=UTF-8' },
    body: ics,
  });

  if (res.ok || res.status === 201 || res.status === 204) {
    await pool.query(
      'UPDATE calendar_events SET external_id=$1, provider=$2 WHERE id=$3',
      [uid, 'icloud', event.id]
    ).catch(console.error);
  }
}

// ── Delete event from iCloud ──────────────────────────────────────────────────

async function deleteEventFromIcloud(connection, externalId) {
  const appleId  = connection.access_token;
  const password = connection.refresh_token;
  await fetch(`${connection.calendar_id}${externalId}.ics`, {
    method: 'DELETE',
    headers: { 'Authorization': basicAuth(appleId, password) },
  }).catch(() => {});
}

module.exports = { discoverCalendars, syncFromIcloud, pushEventToIcloud, deleteEventFromIcloud };
