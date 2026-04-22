import { readDb, writeDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { ComplaintSummary, ParticipantDashboardResponse, SessionUser } from "@/types/domain";

function buildComplaintSummaries(database: Awaited<ReturnType<typeof readDb>>, userId: string): ComplaintSummary[] {
  return database.complaints
    .filter((item) => item.userId === userId)
    .map((complaint) => {
      const user = database.users.find((entry) => entry.id === complaint.userId);
      const event = complaint.eventId ? database.events.find((entry) => entry.id === complaint.eventId) : null;

      return {
        id: complaint.id,
        attendeeId: complaint.attendeeId,
        eventId: complaint.eventId,
        userName: user?.name ?? "Usuario",
        userEmail: user?.email ?? "sem-email",
        eventTitle: event?.title ?? null,
        message: complaint.message,
        status: complaint.status,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function getParticipantDashboard(user: SessionUser): Promise<ParticipantDashboardResponse> {
  const database = await readDb();
  const registrations = database.attendees
    .filter((attendee) => attendee.userId === user.id || attendee.email === user.email)
    .map((attendee) => {
      const event = database.events.find((item) => item.id === attendee.eventId);
      const checkIn = database.checkIns.find((item) => item.attendeeId === attendee.id);

      if (!event) {
        return null;
      }

      return {
        attendeeId: attendee.id,
        eventId: event.id,
        eventTitle: event.title,
        eventDetails: event.details,
        checkedInAt: checkIn?.createdAt ?? null,
        welcomeKitDeliveredAt: attendee.welcomeKitDeliveredAt,
        createdAt: attendee.createdAt
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    user,
    registrations,
    complaints: buildComplaintSummaries(database, user.id)
  };
}

export async function createComplaint(input: {
  userId: string;
  attendeeId?: string | null;
  eventId?: string | null;
  message: string;
}) {
  if (!input.message.trim()) {
    throw new AppError("Descreva sua reclamacao.", 400);
  }

  const database = await readDb();
  const user = database.users.find((item) => item.id === input.userId);

  if (!user) {
    throw new AppError("Usuario nao encontrado.", 404);
  }

  if (input.attendeeId) {
    const attendee = database.attendees.find((item) => item.id === input.attendeeId);

    if (!attendee) {
      throw new AppError("Inscricao nao encontrada.", 404);
    }

    if (attendee.userId !== user.id && attendee.email !== user.email) {
      throw new AppError("Voce nao pode reclamar sobre uma inscricao de outro usuario.", 403);
    }
  }

  const complaint = {
    id: crypto.randomUUID(),
    userId: user.id,
    attendeeId: input.attendeeId ?? null,
    eventId: input.eventId ?? null,
    message: input.message.trim(),
    status: "open" as const,
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };

  database.complaints.push(complaint);
  await writeDb(database);

  return {
    complaintId: complaint.id
  };
}

export async function resolveComplaint(complaintId: string, resolved: boolean) {
  const database = await readDb();
  const complaint = database.complaints.find((item) => item.id === complaintId);

  if (!complaint) {
    throw new AppError("Reclamacao nao encontrada.", 404);
  }

  complaint.status = resolved ? "resolved" : "open";
  complaint.resolvedAt = resolved ? new Date().toISOString() : null;
  await writeDb(database);

  return {
    complaintId: complaint.id,
    status: complaint.status
  };
}
