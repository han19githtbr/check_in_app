import { readDb, writeDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { sendRegistrationConfirmationEmail } from "@/lib/services/email";
import type {
  AdminDashboardResponse,
  AttendeeIdResponse,
  AttendeeRequest,
  AttendeeRecord,
  ComplaintSummary,
  EventIdResponse,
  EventRequest,
  EventResponse,
  UserRecord
} from "@/types/domain";

function validateEventRequest(input: EventRequest) {
  if (!input.title.trim() || !input.details.trim()) {
    throw new AppError("Titulo e descricao sao obrigatorios.", 400);
  }

  if (!Number.isInteger(input.maximumAttendees) || input.maximumAttendees <= 0) {
    throw new AppError("A capacidade maxima precisa ser um numero inteiro positivo.", 400);
  }
}

function validateAttendeeRequest(input: AttendeeRequest) {
  if (!input.name.trim() || !input.email.trim()) {
    throw new AppError("Nome e e-mail sao obrigatorios.", 400);
  }
}

export async function listEvents() {
  const database = await readDb();

  return database.events
    .map((event) => ({
      event: {
        ...event,
        attendeesAmount: database.attendees.filter((attendee) => attendee.eventId === event.id).length
      }
    }))
    .sort((left, right) => left.event.title.localeCompare(right.event.title, "pt-BR"));
}

function buildComplaintSummary(database: Awaited<ReturnType<typeof readDb>>): ComplaintSummary[] {
  return database.complaints
    .map((complaint) => {
      const user = database.users.find((item) => item.id === complaint.userId);
      const event = complaint.eventId ? database.events.find((item) => item.id === complaint.eventId) : null;

      return {
        id: complaint.id,
        attendeeId: complaint.attendeeId,
        eventId: complaint.eventId,
        userName: user?.name ?? "Usuario removido",
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

export async function getEventDetail(eventId: string): Promise<EventResponse> {
  const database = await readDb();
  const event = database.events.find((item) => item.id === eventId);

  if (!event) {
    throw new AppError("Evento nao encontrado.", 404);
  }

  const attendeesAmount = database.attendees.filter((attendee) => attendee.eventId === eventId).length;

  return {
    event: {
      ...event,
      attendeesAmount
    }
  };
}

export async function createEvent(input: EventRequest): Promise<EventIdResponse> {
  validateEventRequest(input);

  const database = await readDb();
  const normalizedSlug = slugify(input.title);

  if (database.events.some((event) => event.slug === normalizedSlug)) {
    throw new AppError("Ja existe um evento com um titulo equivalente.", 409);
  }

  const event = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    details: input.details.trim(),
    slug: normalizedSlug,
    maximumAttendees: input.maximumAttendees
  };

  database.events.push(event);
  await writeDb(database);

  return { eventId: event.id };
}

function findUserById(database: Awaited<ReturnType<typeof readDb>>, userId?: string | null) {
  if (!userId) {
    return null;
  }

  return database.users.find((item) => item.id === userId) ?? null;
}

export async function registerAttendeeOnEvent(
  eventId: string,
  input: AttendeeRequest
): Promise<AttendeeIdResponse> {
  validateAttendeeRequest(input);

  const database = await readDb();
  const event = database.events.find((item) => item.id === eventId);

  if (!event) {
    throw new AppError("Evento nao encontrado.", 404);
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const linkedUser = findUserById(database, input.userId ?? null);

  if (linkedUser && linkedUser.email !== normalizedEmail) {
    throw new AppError("O e-mail informado precisa ser o mesmo da conta autenticada.", 400);
  }

  const alreadyRegistered = database.attendees.some(
    (attendee) => attendee.eventId === eventId && attendee.email.toLowerCase() === normalizedEmail
  );

  if (alreadyRegistered) {
    throw new AppError("Participante ja inscrito neste evento.", 409);
  }

  const attendeesAmount = database.attendees.filter((attendee) => attendee.eventId === eventId).length;

  if (attendeesAmount >= event.maximumAttendees) {
    throw new AppError("Evento lotado.", 400);
  }

  const attendee: AttendeeRecord = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: normalizedEmail,
    eventId,
    userId: linkedUser?.id ?? null,
    welcomeKitDeliveredAt: null,
    createdAt: new Date().toISOString()
  };

  database.attendees.push(attendee);
  await writeDb(database);
  await sendRegistrationConfirmationEmail({
    to: attendee.email,
    attendeeName: attendee.name,
    eventTitle: event.title,
    eventDetails: event.details
  });

  return { attendeeId: attendee.id };
}

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  const database = await readDb();

  const events = await listEvents();
  const attendees = database.attendees
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
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return {
    metrics: {
      totalEvents: database.events.length,
      totalUsers: database.users.length,
      totalAttendees: database.attendees.length,
      pendingWelcomeKits: database.attendees.filter((item) => !item.welcomeKitDeliveredAt).length,
      openComplaints: database.complaints.filter((item) => item.status === "open").length
    },
    events: events.map((item) => item.event),
    attendees,
    complaints: buildComplaintSummary(database)
  };
}

export async function syncParticipantRole(user: UserRecord) {
  const database = await readDb();
  const existingUser = database.users.find((item) => item.id === user.id);

  if (!existingUser) {
    return;
  }

  if (existingUser.role !== user.role) {
    existingUser.role = user.role;
    existingUser.updatedAt = new Date().toISOString();
    await writeDb(database);
  }
}
