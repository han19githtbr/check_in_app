import { Pool } from "pg";

import { AppError } from "@/lib/errors";
import type { Database, UserRole } from "@/types/domain";

declare global {
  // eslint-disable-next-line no-var
  var __passinPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __passinSchemaPromise: Promise<void> | undefined;
}

const emptyDb: Database = {
  events: [],
  users: [],
  sessions: [],
  attendees: [],
  checkIns: [],
  complaints: [],
  emailLogs: []
};

function getConnectionString() {
  return process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? null;
}

function shouldUseFallbackMemoryDb() {
  return !getConnectionString() && process.env.NODE_ENV !== "production";
}

function getPool() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new AppError(
      "Configure POSTGRES_URL ou DATABASE_URL para usar a persistencia em Postgres.",
      500
    );
  }

  if (!globalThis.__passinPool) {
    globalThis.__passinPool = new Pool({
      connectionString
    });
  }

  return globalThis.__passinPool;
}

async function ensureSchema() {
  if (shouldUseFallbackMemoryDb()) {
    return;
  }

  if (!globalThis.__passinSchemaPromise) {
    globalThis.__passinSchemaPromise = (async () => {
      const pool = getPool();

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
    })();
  }

  await globalThis.__passinSchemaPromise;
}

function normalizeUserRole(role: string): UserRole {
  return role === "admin" ? "admin" : "participant";
}

export async function readDb(): Promise<Database> {
  if (shouldUseFallbackMemoryDb()) {
    return emptyDb;
  }

  await ensureSchema();
  const pool = getPool();

  const [eventsResult, usersResult, sessionsResult, attendeesResult, checkInsResult, complaintsResult, emailLogsResult] =
    await Promise.all([
      pool.query(
        "SELECT id, title, details, slug, maximum_attendees FROM events ORDER BY title ASC"
      ),
      pool.query(
        "SELECT id, name, email, role, avatar_url, provider, created_at, updated_at FROM users ORDER BY created_at ASC"
      ),
      pool.query(
        "SELECT id, user_id, role, created_at, expires_at FROM sessions ORDER BY created_at ASC"
      ),
      pool.query(
        "SELECT id, name, email, event_id, user_id, welcome_kit_delivered_at, created_at FROM attendees ORDER BY created_at ASC"
      ),
      pool.query(
        "SELECT id, attendee_id, created_at FROM check_ins ORDER BY id ASC"
      ),
      pool.query(
        "SELECT id, user_id, attendee_id, event_id, message, status, created_at, resolved_at FROM complaints ORDER BY created_at ASC"
      ),
      pool.query(
        "SELECT id, recipient_email, subject, status, provider, error_message, created_at FROM email_logs ORDER BY created_at ASC"
      )
    ]);

  return {
    events: eventsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      details: row.details,
      slug: row.slug,
      maximumAttendees: Number(row.maximum_attendees)
    })),
    users: usersResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: normalizeUserRole(row.role),
      avatarUrl: row.avatar_url,
      provider: "google",
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })),
    sessions: sessionsResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      role: normalizeUserRole(row.role),
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString()
    })),
    attendees: attendeesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      eventId: row.event_id,
      userId: row.user_id,
      welcomeKitDeliveredAt: row.welcome_kit_delivered_at
        ? new Date(row.welcome_kit_delivered_at).toISOString()
        : null,
      createdAt: new Date(row.created_at).toISOString()
    })),
    checkIns: checkInsResult.rows.map((row) => ({
      id: Number(row.id),
      attendeeId: row.attendee_id,
      createdAt: new Date(row.created_at).toISOString()
    })),
    complaints: complaintsResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      attendeeId: row.attendee_id,
      eventId: row.event_id,
      message: row.message,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null
    })),
    emailLogs: emailLogsResult.rows.map((row) => ({
      id: row.id,
      to: row.recipient_email,
      subject: row.subject,
      status: row.status,
      provider: row.provider,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at).toISOString()
    }))
  };
}

export async function writeDb(database: Database) {
  if (shouldUseFallbackMemoryDb()) {
    return;
  }

  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE email_logs, complaints, check_ins, attendees, sessions, users, events RESTART IDENTITY CASCADE"
    );

    for (const event of database.events) {
      await client.query(
        `
          INSERT INTO events (id, title, details, slug, maximum_attendees)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [event.id, event.title, event.details, event.slug, event.maximumAttendees]
      );
    }

    for (const user of database.users) {
      await client.query(
        `
          INSERT INTO users (id, name, email, role, avatar_url, provider, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [user.id, user.name, user.email, user.role, user.avatarUrl, user.provider, user.createdAt, user.updatedAt]
      );
    }

    for (const session of database.sessions) {
      await client.query(
        `
          INSERT INTO sessions (id, user_id, role, created_at, expires_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [session.id, session.userId, session.role, session.createdAt, session.expiresAt]
      );
    }

    for (const attendee of database.attendees) {
      await client.query(
        `
          INSERT INTO attendees (
            id,
            name,
            email,
            event_id,
            user_id,
            welcome_kit_delivered_at,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          attendee.id,
          attendee.name,
          attendee.email,
          attendee.eventId,
          attendee.userId,
          attendee.welcomeKitDeliveredAt,
          attendee.createdAt
        ]
      );
    }

    for (const checkIn of database.checkIns) {
      await client.query(
        `
          INSERT INTO check_ins (id, attendee_id, created_at)
          VALUES ($1, $2, $3)
        `,
        [checkIn.id, checkIn.attendeeId, checkIn.createdAt]
      );
    }

    for (const complaint of database.complaints) {
      await client.query(
        `
          INSERT INTO complaints (id, user_id, attendee_id, event_id, message, status, created_at, resolved_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          complaint.id,
          complaint.userId,
          complaint.attendeeId,
          complaint.eventId,
          complaint.message,
          complaint.status,
          complaint.createdAt,
          complaint.resolvedAt
        ]
      );
    }

    for (const emailLog of database.emailLogs) {
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
          emailLog.errorMessage,
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
  }
}
