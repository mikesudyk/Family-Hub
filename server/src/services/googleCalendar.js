const { google } = require('googleapis');
const { pool }   = require('../db');

function makeClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  return makeClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state,
  });
}

async function exchangeCode(code) {
  const { tokens } = await makeClient().getToken(code);
  return tokens;
}

// Returns an authenticated OAuth2 client, auto-refreshing tokens as needed
async function getClient(connection) {
  const client = makeClient();
  client.setCredentials({
    access_token:  connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date:   connection.expires_at ? new Date(connection.expires_at).getTime() : null,
  });
  client.on('tokens', async tokens => {
    if (tokens.access_token) {
      await pool.query(
        'UPDATE calendar_connections SET access_token=$1, expires_at=$2 WHERE id=$3',
        [tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null, connection.id]
      );
    }
  });
  return client;
}

function googleEventToLocal(event, familyId, memberId) {
  if (!event.start) return null;
  const date = event.start.date || event.start.dateTime?.split('T')[0];
  if (!date) return null;
  let time = null;
  if (event.start.dateTime) {
    const d = new Date(event.start.dateTime);
    time = d.toISOString().split('T')[1].slice(0, 5); // HH:MM
  }
  return { familyId, memberId, externalId: event.id, provider: 'google',
    title: event.summary || '(No title)', date, time, color: 'blue', icon: '📅' };
}

function localToGoogleEvent(event) {
  return {
    summary: event.title,
    start: event.time
      ? { dateTime: `${event.date}T${event.time}:00`, timeZone: 'UTC' }
      : { date: event.date },
    end: event.time
      ? { dateTime: `${event.date}T${event.time}:00`, timeZone: 'UTC' }
      : { date: event.date },
  };
}

// ── Sync Google → DB ──────────────────────────────────────────────────────────

async function syncFromGoogle(connection) {
  const client   = await getClient(connection);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const params = { calendarId: connection.calendar_id || 'primary', singleEvents: true };

  if (connection.sync_token) {
    params.syncToken = connection.sync_token;
  } else {
    const since = new Date();
    since.setDate(since.getDate() - 60);
    params.timeMin = since.toISOString();
    params.orderBy = 'startTime';
  }

  let items = [], nextSyncToken;
  try {
    const res  = await calendar.events.list(params);
    items          = res.data.items || [];
    nextSyncToken  = res.data.nextSyncToken;
  } catch (err) {
    if (err.code === 410) {
      // Sync token expired — full re-sync
      await pool.query('UPDATE calendar_connections SET sync_token=NULL WHERE id=$1', [connection.id]);
      connection.sync_token = null;
      return syncFromGoogle(connection);
    }
    throw err;
  }

  for (const event of items) {
    if (event.status === 'cancelled') {
      await pool.query(
        'DELETE FROM calendar_events WHERE family_id=$1 AND external_id=$2 AND provider=$3',
        [connection.family_id, event.id, 'google']
      );
    } else {
      const local = googleEventToLocal(event, connection.family_id, connection.member_id);
      if (!local) continue;
      await pool.query(
        `INSERT INTO calendar_events
           (family_id, member_id, date, title, time, color, icon, external_id, provider)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (family_id, external_id, provider) WHERE external_id IS NOT NULL
         DO UPDATE SET title=$4, date=$3, time=$5`,
        [local.familyId, local.memberId, local.date, local.title,
         local.time, local.color, local.icon, local.externalId, local.provider]
      );
    }
  }

  if (nextSyncToken) {
    await pool.query(
      'UPDATE calendar_connections SET sync_token=$1 WHERE id=$2',
      [nextSyncToken, connection.id]
    );
  }

  return { synced: items.length };
}

// ── Push local event → Google ─────────────────────────────────────────────────

async function pushEventToGoogle(connection, event) {
  const client   = await getClient(connection);
  const calendar = google.calendar({ version: 'v3', auth: client });
  const resource = localToGoogleEvent(event);

  if (event.external_id && event.provider === 'google') {
    await calendar.events.update({
      calendarId: connection.calendar_id || 'primary',
      eventId: event.external_id,
      resource,
    });
  } else {
    const res = await calendar.events.insert({
      calendarId: connection.calendar_id || 'primary',
      resource,
    });
    // Save Google event ID back to our record
    await pool.query(
      'UPDATE calendar_events SET external_id=$1, provider=$2 WHERE id=$3',
      [res.data.id, 'google', event.id]
    );
  }
}

async function deleteEventFromGoogle(connection, externalId) {
  const client   = await getClient(connection);
  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.delete({
    calendarId: connection.calendar_id || 'primary',
    eventId: externalId,
  }).catch(() => {}); // ignore 404 (already deleted in Google)
}

// ── Webhook registration ──────────────────────────────────────────────────────

async function registerWebhook(connection) {
  const webhookUrl = `${process.env.SERVER_URL || 'https://aeramea-server-production.up.railway.app'}/api/calendar/webhook/google`;
  const client   = await getClient(connection);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const channelId = `aeramea-${connection.id}-${Date.now()}`;
  try {
    const res = await calendar.events.watch({
      calendarId: connection.calendar_id || 'primary',
      resource: { id: channelId, type: 'web_hook', address: webhookUrl },
    });
    await pool.query(
      'UPDATE calendar_connections SET webhook_channel_id=$1, webhook_expiry=$2 WHERE id=$3',
      [res.data.id, new Date(Number(res.data.expiration)), connection.id]
    );
  } catch {
    // Webhook registration optional — polling still works
  }
}

module.exports = { getAuthUrl, exchangeCode, syncFromGoogle, pushEventToGoogle, deleteEventFromGoogle, registerWebhook };
