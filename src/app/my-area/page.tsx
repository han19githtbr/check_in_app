import { redirect } from "next/navigation";

import { ComplaintForm } from "@/components/forms/complaint-form";
import { requireUserSession } from "@/lib/auth";
import { getParticipantDashboard } from "@/lib/services/portal";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyAreaPage() {
  let user;

  try {
    ({ user } = await requireUserSession());
  } catch {
    redirect("/");
  }

  const dashboard = await getParticipantDashboard({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl
  });

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Area do participante</span>
        <h1>{dashboard.user.name}</h1>
        <p>
          Consulte em quais eventos voce esta inscrito, acompanhe o status do seu kit de boas-vindas e envie
          reclamacoes quando precisar.
        </p>
      </section>

      <section className="grid two">
        <div className="panel padded">
          <div className="section-header">
            <div>
              <h2>Minhas inscricoes</h2>
              <p className="copy-muted">Cada inscricao fica vinculada ao seu Gmail autenticado.</p>
            </div>
          </div>

          {dashboard.registrations.length ? (
            <div className="attendee-list">
              {dashboard.registrations.map((registration) => (
                <article className="attendee-card" key={registration.attendeeId}>
                  <div className="section-header">
                    <div>
                      <h3>{registration.eventTitle}</h3>
                      <p className="copy-muted">{registration.eventDetails}</p>
                    </div>
                    <span className={`chip ${registration.checkedInAt ? "success" : "warning"}`}>
                      {registration.checkedInAt ? "Check-in realizado" : "Aguardando check-in"}
                    </span>
                  </div>

                  <div className="event-meta">
                    <span className={`chip ${registration.welcomeKitDeliveredAt ? "success" : "warning"}`}>
                      Kit: {registration.welcomeKitDeliveredAt ? "entregue" : "pendente"}
                    </span>
                    <span className="chip">Inscrito em {formatDateTime(registration.createdAt)}</span>
                  </div>

                  <div className="form-shell">
                    <ComplaintForm attendeeId={registration.attendeeId} eventId={registration.eventId} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhuma inscricao encontrada para este Gmail.</div>
          )}
        </div>

        <aside className="panel padded">
          <div className="section-header">
            <div>
              <h2>Historico de reclamacoes</h2>
              <p className="copy-muted">Tudo o que voce reportar fica registrado para o administrador.</p>
            </div>
          </div>

          {dashboard.complaints.length ? (
            <div className="attendee-list">
              {dashboard.complaints.map((complaint) => (
                <article className="attendee-card" key={complaint.id}>
                  <div className="section-header">
                    <div>
                      <h3>{complaint.eventTitle ?? "Reclamacao geral"}</h3>
                      <p className="copy-muted">{formatDateTime(complaint.createdAt)}</p>
                    </div>
                    <span className={`chip ${complaint.status === "resolved" ? "success" : "warning"}`}>
                      {complaint.status === "resolved" ? "Resolvida" : "Aberta"}
                    </span>
                  </div>
                  <p>{complaint.message}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Voce ainda nao enviou reclamacoes.</div>
          )}
        </aside>
      </section>
    </main>
  );
}
