import Link from "next/link";
import { notFound } from "next/navigation";

import { WelcomeKitToggle } from "@/components/admin/welcome-kit-toggle";
import { RegisterAttendeeForm } from "@/components/forms/register-attendee-form";
import { requireAdminSession } from "@/lib/auth";
import { getEventAttendees } from "@/lib/services/attendees";
import { getEventDetail } from "@/lib/services/events";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;

  try {
    await requireAdminSession();
    const [eventResponse, attendeesResponse] = await Promise.all([getEventDetail(id), getEventAttendees(id)]);
    const { event } = eventResponse;

    return (
      <main className="shell">
        <section className="hero">
          <span className="eyebrow">Painel do evento</span>
          <h1>{event.title}</h1>
          <p>{event.details}</p>

          <div className="metric-row">
            <article className="metric-card">
              <span>Capacidade</span>
              <strong>{event.maximumAttendees}</strong>
            </article>

            <article className="metric-card">
              <span>Inscritos</span>
              <strong>{event.attendeesAmount}</strong>
            </article>
          </div>

          <div className="actions">
            <Link className="button-secondary" href="/">
              Voltar ao dashboard
            </Link>
          </div>
        </section>

        <section className="grid two">
          <div className="panel padded">
            <div className="section-header">
              <div>
                <h2>Lista de participantes</h2>
                <p className="copy-muted">Confira inscricoes, horario de cadastro e situacao de entrada.</p>
              </div>
            </div>

            {attendeesResponse.attendees.length ? (
              <div className="attendee-list">
                {attendeesResponse.attendees.map((attendee) => (
                  <article className="attendee-card" key={attendee.id}>
                    <div className="section-header">
                      <div>
                        <h3>{attendee.name}</h3>
                        <p className="copy-muted">{attendee.email}</p>
                      </div>

                      <span className={`chip ${attendee.checkedInAt ? "success" : "warning"}`}>
                        {attendee.checkedInAt ? "Presente" : "Nao chegou"}
                      </span>
                    </div>

                    <div className="event-meta">
                      <span className="chip">Inscrito em {formatDateTime(attendee.createdAt)}</span>
                      <span className="chip">
                        Check-in: {attendee.checkedInAt ? formatDateTime(attendee.checkedInAt) : "Pendente"}
                      </span>
                      <span className={`chip ${attendee.welcomeKitDeliveredAt ? "success" : "warning"}`}>
                        Kit: {attendee.welcomeKitDeliveredAt ? formatDateTime(attendee.welcomeKitDeliveredAt) : "Pendente"}
                      </span>
                      <Link className="chip" href={`/attendees/${attendee.id}/badge`}>
                        Abrir cracha
                      </Link>
                    </div>

                    <div className="actions">
                      <WelcomeKitToggle
                        attendeeId={attendee.id}
                        delivered={Boolean(attendee.welcomeKitDeliveredAt)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Ainda nao ha participantes neste evento.</div>
            )}
          </div>

          <aside className="panel padded">
            <div className="section-header">
              <div>
                <h2>Registrar participante</h2>
                <p className="copy-muted">As validacoes de duplicidade e lotacao continuam ativas nesta versao.</p>
              </div>
            </div>

            <RegisterAttendeeForm eventId={event.id} />
          </aside>
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
