import { readDb, writeDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { AttendeeBadgeResponse, AttendeesListResponse, CheckInRecord } from "@/types/domain";

export async function getEventAttendees(eventId: string): Promise<AttendeesListResponse> {
  const database = await readDb();
  const event = database.events.find((item) => item.id === eventId);

  if (!event) {
    throw new AppError("Evento nao encontrado.", 404);
  }

  const attendees = database.attendees
    .filter((attendee) => attendee.eventId === eventId)
    .map((attendee) => {
      const checkIn = database.checkIns.find((entry) => entry.attendeeId === attendee.id);

      return {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        createdAt: attendee.createdAt,
        checkedInAt: checkIn?.createdAt ?? null,
        welcomeKitDeliveredAt: attendee.welcomeKitDeliveredAt,
        welcomeKitStatus: attendee.welcomeKitDeliveredAt ? ("delivered" as const) : ("pending" as const)
      };
    });

  return { attendees };
}

export async function getAttendeeBadge(
  attendeeId: string,
  origin: string
): Promise<AttendeeBadgeResponse> {
  const database = await readDb();
  const attendee = database.attendees.find((item) => item.id === attendeeId);

  if (!attendee) {
    throw new AppError("Participante nao encontrado.", 404);
  }

  return {
    badge: {
      name: attendee.name,
      email: attendee.email,
      checkInUrl: `${origin}/api/attendees/${attendeeId}/check-in`,
      eventId: attendee.eventId
    }
  };
}

export async function checkInAttendee(attendeeId: string) {
  const database = await readDb();
  const attendee = database.attendees.find((item) => item.id === attendeeId);

  if (!attendee) {
    throw new AppError("Participante nao encontrado.", 404);
  }

  const alreadyCheckedIn = database.checkIns.some((checkIn) => checkIn.attendeeId === attendeeId);

  if (alreadyCheckedIn) {
    throw new AppError("Participante ja realizou check-in.", 409);
  }

  const checkIn: CheckInRecord = {
    id: database.checkIns.length + 1,
    attendeeId,
    createdAt: new Date().toISOString()
  };

  database.checkIns.push(checkIn);
  await writeDb(database);

  return checkIn;
}

export async function markWelcomeKitDelivery(attendeeId: string, delivered: boolean) {
  const database = await readDb();
  const attendee = database.attendees.find((item) => item.id === attendeeId);

  if (!attendee) {
    throw new AppError("Participante nao encontrado.", 404);
  }

  attendee.welcomeKitDeliveredAt = delivered ? new Date().toISOString() : null;
  await writeDb(database);

  return {
    attendeeId: attendee.id,
    welcomeKitDeliveredAt: attendee.welcomeKitDeliveredAt
  };
}
