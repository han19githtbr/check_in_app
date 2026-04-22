export type EventRecord = {
  id: string;
  title: string;
  details: string;
  slug: string;
  maximumAttendees: number;
};

export type UserRole = "admin" | "participant";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  provider: "google";
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
};

export type AttendeeRecord = {
  id: string;
  name: string;
  email: string;
  eventId: string;
  userId: string | null;
  welcomeKitDeliveredAt: string | null;
  createdAt: string;
};

export type CheckInRecord = {
  id: number;
  attendeeId: string;
  createdAt: string;
};

export type ComplaintStatus = "open" | "resolved";

export type ComplaintRecord = {
  id: string;
  userId: string;
  attendeeId: string | null;
  eventId: string | null;
  message: string;
  status: ComplaintStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type EmailDeliveryStatus = "sent" | "failed" | "skipped";

export type EmailLogRecord = {
  id: string;
  to: string;
  subject: string;
  status: EmailDeliveryStatus;
  provider: string;
  errorMessage: string | null;
  createdAt: string;
};

export type Database = {
  events: EventRecord[];
  users: UserRecord[];
  sessions: SessionRecord[];
  attendees: AttendeeRecord[];
  checkIns: CheckInRecord[];
  complaints: ComplaintRecord[];
  emailLogs: EmailLogRecord[];
};

export type EventRequest = {
  title: string;
  details: string;
  maximumAttendees: number;
};

export type AttendeeRequest = {
  name: string;
  email: string;
  userId?: string | null;
};

export type EventDetail = {
  id: string;
  title: string;
  details: string;
  slug: string;
  maximumAttendees: number;
  attendeesAmount: number;
};

export type EventResponse = {
  event: EventDetail;
};

export type EventIdResponse = {
  eventId: string;
};

export type AttendeeIdResponse = {
  attendeeId: string;
};

export type AttendeeDetails = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  checkedInAt: string | null;
  welcomeKitDeliveredAt: string | null;
  welcomeKitStatus: "delivered" | "pending";
};

export type AttendeesListResponse = {
  attendees: AttendeeDetails[];
};

export type AttendeeBadge = {
  name: string;
  email: string;
  checkInUrl: string;
  eventId: string;
};

export type AttendeeBadgeResponse = {
  badge: AttendeeBadge;
};

export type ErrorResponse = {
  message: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export type UserEventSummary = {
  attendeeId: string;
  eventId: string;
  eventTitle: string;
  eventDetails: string;
  checkedInAt: string | null;
  welcomeKitDeliveredAt: string | null;
  createdAt: string;
};

export type ComplaintSummary = {
  id: string;
  attendeeId: string | null;
  eventId: string | null;
  userName: string;
  userEmail: string;
  eventTitle: string | null;
  message: string;
  status: ComplaintStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type ParticipantDashboardResponse = {
  user: SessionUser;
  registrations: UserEventSummary[];
  complaints: ComplaintSummary[];
};

export type AdminDashboardResponse = {
  metrics: {
    totalEvents: number;
    totalUsers: number;
    totalAttendees: number;
    pendingWelcomeKits: number;
    openComplaints: number;
  };
  events: EventDetail[];
  attendees: AttendeeDetails[];
  complaints: ComplaintSummary[];
};
