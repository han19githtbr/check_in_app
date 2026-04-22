import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckInButton } from "@/components/badge/check-in-button";
import { requireAdminSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getAttendeeBadge, getEventAttendees } from "@/lib/services/attendees";
import { getBaseUrl, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    attendeeId: string;
  }>;
};

export default async function AttendeeBadgePage({ params }: Props) {
  const { attendeeId } = await params;

  try {
    await requireAdminSession();
    const badgeResponse = await getAttendeeBadge(attendeeId, getBaseUrl());
    const attendeesResponse = await getEventAttendees(badgeResponse.badge.eventId);
    const attendee = attendeesResponse.attendees.find((item) => item.id === attendeeId);

    if (!attendee) {
      notFound();
    }

    return (
      <main className="shell">
        <section className="hero">
          <span className="eyebrow">Cracha digital</span>
          <h1>{badgeResponse.badge.name}</h1>
          <p>Use este cartao para validar a entrada da pessoa participante e acompanhar o status do check-in.</p>

          <div className="actions">
            <Link className="button-secondary" href={`/events/${badgeResponse.badge.eventId}`}>
              Voltar ao evento
            </Link>
          </div>
        </section>

        <section className="grid two">
          <div className="panel padded">
            <div className="badge-card">
              <div className="section-header">
                <div>
                  <h2>{badgeResponse.badge.name}</h2>
                  <p className="copy-muted">{badgeResponse.badge.email}</p>
                </div>
                <span className={`chip ${attendee.checkedInAt ? "success" : "warning"}`}>
                  {attendee.checkedInAt ? "Entrada liberada" : "Aguardando check-in"}
                </span>
              </div>

              <div className="badge-line">
                <span className="chip">Participante ID: {attendee.id}</span>
                <span className="chip">Inscricao em {formatDateTime(attendee.createdAt)}</span>
                <span className="chip">
                  Check-in: {attendee.checkedInAt ? formatDateTime(attendee.checkedInAt) : "Nao realizado"}
                </span>
              </div>

              <CheckInButton attendeeId={attendee.id} checkedInAt={attendee.checkedInAt} />
            </div>
          </div>

          <aside className="panel padded">
            <div className="section-header">
              <div>
                <h2>Endpoint do cracha</h2>
                <p className="copy-muted">Mantive o contrato da API para facilitar integracoes futuras.</p>
              </div>
            </div>

            <div className="badge-card">
              <p className="copy-muted">{badgeResponse.badge.checkInUrl}</p>
              <div className="badge-line">
                <span className="chip">Evento: {badgeResponse.badge.eventId}</span>
              </div>
            </div>
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
