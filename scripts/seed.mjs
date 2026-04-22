import { Pool } from "pg";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Configure POSTGRES_URL ou DATABASE_URL no .env.local antes de rodar o seed.");
}

const pool = new Pool({
  connectionString
});

const now = new Date();
const iso = (offsetMinutes = 0) => new Date(now.getTime() + offsetMinutes * 60 * 1000).toISOString();

const adminUserId = "seed-admin-user";
const participantUserId = "seed-participant-user";
const eventId = "seed-event-summit-2026";
const attendeeId = "seed-attendee-participant";
const complaintId = "seed-complaint-kit";

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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE email_logs, complaints, check_ins, attendees, sessions, users, events RESTART IDENTITY CASCADE"
    );

    await client.query(
      `
        INSERT INTO events (id, title, details, slug, maximum_attendees)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        eventId,
        "Summit 2026",
        "Evento demonstrativo com fluxo completo de inscricao, kit e reclamacao.",
        "summit-2026",
        120
      ]
    );

    await client.query(
      `
        INSERT INTO users (id, name, email, role, avatar_url, provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8),
               ($9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        adminUserId,
        "Admin Demo",
        "admin@gmail.com",
        "admin",
        null,
        "google",
        iso(-180),
        iso(-180),
        participantUserId,
        "Participante Demo",
        "participante@gmail.com",
        "participant",
        null,
        "google",
        iso(-170),
        iso(-170)
      ]
    );

    await client.query(
      `
        INSERT INTO attendees (id, name, email, event_id, user_id, welcome_kit_delivered_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [attendeeId, "Participante Demo", "participante@gmail.com", eventId, participantUserId, null, iso(-120)]
    );

    await client.query(
      `
        INSERT INTO complaints (id, user_id, attendee_id, event_id, message, status, created_at, resolved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        complaintId,
        participantUserId,
        attendeeId,
        eventId,
        "Nao recebi meu kit de boas-vindas na retirada.",
        "open",
        iso(-30),
        null
      ]
    );

    await client.query(
      `
        INSERT INTO email_logs (id, recipient_email, subject, status, provider, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        "seed-email-log",
        "participante@gmail.com",
        "Inscricao confirmada: Summit 2026",
        "skipped",
        "resend",
        "Seed inicial sem envio real de e-mail.",
        iso(-119)
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log("Seed Postgres concluido com sucesso.");
  console.log("Usuarios de exemplo:");
  console.log("- admin@gmail.com (admin)");
  console.log("- participante@gmail.com (participant)");
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
