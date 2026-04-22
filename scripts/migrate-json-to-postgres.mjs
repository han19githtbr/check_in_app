import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Configure POSTGRES_URL ou DATABASE_URL no .env.local antes de migrar.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const jsonPath = path.join(rootDir, "data", "db.json");

const pool = new Pool({
  connectionString
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      details TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      maximum_attendees INTEGER NOT NULL CHECK (maximum_attendees > 0)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
      avatar_url TEXT,
      provider TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      welcome_kit_delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS attendees_event_email_idx
      ON attendees (event_id, email);

    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY,
      attendee_id TEXT NOT NULL UNIQUE REFERENCES attendees(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attendee_id TEXT REFERENCES attendees(id) ON DELETE SET NULL,
      event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
      created_at TIMESTAMPTZ NOT NULL,
      resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
      provider TEXT NOT NULL,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);
}

async function run() {
  await ensureSchema();
  const raw = await readFile(jsonPath, "utf-8");
  const database = JSON.parse(raw);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE email_logs, complaints, check_ins, attendees, sessions, users, events RESTART IDENTITY CASCADE"
    );

    for (const event of database.events ?? []) {
      await client.query(
        `
          INSERT INTO events (id, title, details, slug, maximum_attendees)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [event.id, event.title, event.details, event.slug, event.maximumAttendees]
      );
    }

    for (const user of database.users ?? []) {
      await client.query(
        `
          INSERT INTO users (id, name, email, role, avatar_url, provider, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          user.id,
          user.name,
          user.email,
          user.role,
          user.avatarUrl ?? null,
          user.provider ?? "google",
          user.createdAt,
          user.updatedAt ?? user.createdAt
        ]
      );
    }

    for (const session of database.sessions ?? []) {
      await client.query(
        `
          INSERT INTO sessions (id, user_id, role, created_at, expires_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [session.id, session.userId, session.role, session.createdAt, session.expiresAt]
      );
    }

    for (const attendee of database.attendees ?? []) {
      await client.query(
        `
          INSERT INTO attendees (id, name, email, event_id, user_id, welcome_kit_delivered_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          attendee.id,
          attendee.name,
          attendee.email,
          attendee.eventId,
          attendee.userId ?? null,
          attendee.welcomeKitDeliveredAt ?? null,
          attendee.createdAt
        ]
      );
    }

    for (const checkIn of database.checkIns ?? []) {
      await client.query(
        `
          INSERT INTO check_ins (id, attendee_id, created_at)
          VALUES ($1, $2, $3)
        `,
        [checkIn.id, checkIn.attendeeId, checkIn.createdAt]
      );
    }

    for (const complaint of database.complaints ?? []) {
      await client.query(
        `
          INSERT INTO complaints (id, user_id, attendee_id, event_id, message, status, created_at, resolved_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          complaint.id,
          complaint.userId,
          complaint.attendeeId ?? null,
          complaint.eventId ?? null,
          complaint.message,
          complaint.status,
          complaint.createdAt,
          complaint.resolvedAt ?? null
        ]
      );
    }

    for (const emailLog of database.emailLogs ?? []) {
      await client.query(
        `
          INSERT INTO email_logs (id, recipient_email, subject, status, provider, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          emailLog.id,
          emailLog.to,
          emailLog.subject,
          emailLog.status,
          emailLog.provider,
          emailLog.errorMessage ?? null,
          emailLog.createdAt
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`Migracao concluida com sucesso a partir de: ${jsonPath}`);
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
