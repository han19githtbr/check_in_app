import Link from "next/link";
import { redirect } from "next/navigation";

import { ComplaintStatusToggle } from "@/components/admin/complaint-status-toggle";
import { CreateEventForm } from "@/components/forms/create-event-form";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/events";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/");
  }

  const dashboard = await getAdminDashboard();

  return (
    <main className="shell page-flow">
      <section className="hero hero-grid">
        <div className="hero-content">
          <span className="eyebrow">Painel administrativo</span>
          <h1>Gestao completa da plataforma</h1>
          <p className="hero-lead">
            Aqui o administrador controla eventos, participantes, check-in, entrega de kits e reclamacoes enviadas
            pelos usuarios.
          </p>

          <div className="metric-row">
            <article className="metric-card">
              <span>Eventos</span>
              <strong>{dashboard.metrics.totalEvents}</strong>
            </article>
            <article className="metric-card">
              <span>Usuarios</span>
              <strong>{dashboard.metrics.totalUsers}</strong>
            </article>
            <article className="metric-card">
              <span>Kits pendentes</span>
              <strong>{dashboard.metrics.pendingWelcomeKits}</strong>
            </article>
            <article className="metric-card">
              <span>Reclamacoes abertas</span>
              <strong>{dashboard.metrics.openComplaints}</strong>
            </article>
          </div>
        </div>

        <aside className="hero-panel">
          <article className="spotlight-card">
            <strong>Operacao em tempo real</strong>
            <p className="copy-muted">Acompanhe capacidade, pendencias e mensagens sem perder o contexto da pagina.</p>
          </article>
          <article className="spotlight-card">
            <strong>Prioridade do dia</strong>
            <p className="copy-muted">
              {dashboard.metrics.openComplaints > 0
                ? `${dashboard.metrics.openComplaints} reclamacao(oes) aguardando tratativa.`
                : "Nenhuma reclamacao aberta no momento."}
            </p>
          </article>
          <article className="spotlight-card">
            <strong>Pronto para cadastro</strong>
            <p className="copy-muted">Crie novos eventos com um formulario mais limpo e melhor distribuido no mobile.</p>
          </article>
        </aside>
      </section>

      <section className="grid two">
        <div className="panel padded">
          <div className="section-header">
            <div>
              <h2>Eventos</h2>
              <p className="copy-muted">Abra um evento para cadastrar participante, conferir kit e fazer check-in.</p>
            </div>
          </div>

          {dashboard.events.length ? (
            <div className="event-list">
              {dashboard.events.map((event) => (
                <Link className="event-card" href={`/events/${event.id}`} key={event.id}>
                  <div className="section-header">
                    <div>
                      <h3>{event.title}</h3>
                      <p className="copy-muted">{event.details}</p>
                    </div>
                    <span className="chip">{event.attendeesAmount}/{event.maximumAttendees}</span>
                  </div>
                  <div className="event-meta">
                    <span className="chip">Gerenciar inscricoes</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhum evento disponivel. Crie o primeiro ao lado.</div>
          )}
        </div>

        <aside className="panel padded">
          <div className="section-header">
            <div>
              <h2>Novo evento</h2>
              <p className="copy-muted">Cadastro rapido para alimentar a plataforma.</p>
            </div>
          </div>
          <CreateEventForm />
        </aside>
      </section>

      <section className="grid two">
        <div className="panel padded">
          <div className="section-header">
            <div>
              <h2>Inscricoes recentes</h2>
              <p className="copy-muted">Acompanhe a situacao de presenca e kit das pessoas participantes.</p>
            </div>
          </div>

          {dashboard.attendees.length ? (
            <div className="attendee-list">
              {dashboard.attendees.slice(0, 8).map((attendee) => (
                <article className="attendee-card" key={attendee.id}>
                  <div className="section-header">
                    <div>
                      <h3>{attendee.name}</h3>
                      <p className="copy-muted">{attendee.email}</p>
                    </div>
                    <span className={`chip ${attendee.checkedInAt ? "success" : "warning"}`}>
                      {attendee.checkedInAt ? "Check-in ok" : "Check-in pendente"}
                    </span>
                  </div>
                  <div className="event-meta">
                    <span className={`chip ${attendee.welcomeKitDeliveredAt ? "success" : "warning"}`}>
                      Kit: {attendee.welcomeKitDeliveredAt ? "entregue" : "pendente"}
                    </span>
                    <span className="chip">Inscricao: {formatDateTime(attendee.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Ainda nao ha participantes inscritos.</div>
          )}
        </div>

        <aside className="panel padded">
          <div className="section-header">
            <div>
              <h2>Reclamacoes</h2>
              <p className="copy-muted">Mensagens enviadas pelos participantes aparecem aqui para tratamento.</p>
            </div>
          </div>

          {dashboard.complaints.length ? (
            <div className="attendee-list">
              {dashboard.complaints.map((complaint) => (
                <article className="attendee-card" key={complaint.id}>
                  <div className="section-header">
                    <div>
                      <h3>{complaint.userName}</h3>
                      <p className="copy-muted">{complaint.userEmail}</p>
                    </div>
                    <span className={`chip ${complaint.status === "resolved" ? "success" : "warning"}`}>
                      {complaint.status === "resolved" ? "Resolvida" : "Aberta"}
                    </span>
                  </div>

                  <p>{complaint.message}</p>

                  <div className="event-meta">
                    <span className="chip">Evento: {complaint.eventTitle ?? "Nao informado"}</span>
                    <span className="chip">Criada em {formatDateTime(complaint.createdAt)}</span>
                  </div>

                  <div className="actions">
                    <ComplaintStatusToggle
                      complaintId={complaint.id}
                      resolved={complaint.status === "resolved"}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhuma reclamacao registrada ate o momento.</div>
          )}
        </aside>
      </section>
    </main>
  );
}
