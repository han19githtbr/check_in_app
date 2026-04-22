import Link from "next/link";

import { getSession } from "@/lib/auth";
import { listEvents } from "@/lib/services/events";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    authError?: string;
  }>;
};

export default async function HomePage({ searchParams }: Props) {
  const resolvedSearchParams: { authError?: string } = (searchParams ? await searchParams : {}) ?? {};
  const [events, session] = await Promise.all([listEvents(), getSession()]);
  const totalAttendees = events.reduce((accumulator, item) => accumulator + item.event.attendeesAmount, 0);
  const authError = resolvedSearchParams.authError;

  return (
    <main className="shell">
      <section className="hero hero-grid">
        <div>
          <span className="eyebrow">Pass.in Experience</span>
          <h1>Gestao de eventos com acesso Google, portal do participante e painel administrativo completo.</h1>
          <p>
            O projeto agora cobre autenticacao com Gmail, inscricoes com confirmacao por e-mail, controle de
            check-in, entrega de kit de boas-vindas e canal de reclamacoes para cada participante.
          </p>

          <div className="metric-row">
            <article className="metric-card">
              <span>Eventos</span>
              <strong>{events.length}</strong>
            </article>

            <article className="metric-card">
              <span>Inscricoes</span>
              <strong>{totalAttendees}</strong>
            </article>
          </div>
        </div>

        <div className="panel padded surface-highlight">
          <div className="section-header">
            <div>
              <h2>Entrar na plataforma</h2>
              <p className="copy-muted">Escolha o perfil correto para acessar as funcoes certas.</p>
            </div>
          </div>

          {authError ? <p className="feedback error">{authError}</p> : null}

          <div className="login-grid">
            <article className="login-card">
              <h3>Administrador</h3>
              <p className="copy-muted">
                Cadastra eventos, registra participantes, faz check-in, entrega kits e responde reclamacoes.
              </p>
              <a className="button" href="/api/auth/google?role=admin">
                Entrar com Gmail
              </a>
            </article>

            <article className="login-card">
              <h3>Participante</h3>
              <p className="copy-muted">
                Consulta inscricoes, acompanha o evento vinculado e envia reclamacoes direto ao administrador.
              </p>
              <a className="button-secondary" href="/api/auth/google?role=participant">
                Acessar minha area
              </a>
            </article>
          </div>

          {session.authenticated && session.user ? (
            <div className="feedback success">
              Sessao ativa para {session.user.email}.{" "}
              <Link
                className="inline-link"
                href={session.user.role === "admin" ? "/admin" : "/my-area"}
              >
                Abrir painel
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid two">
        <div className="panel padded">
          <div className="section-header">
            <div>
              <h2>Eventos publicados</h2>
              <p className="copy-muted">Visao geral dos eventos ja disponiveis na base local.</p>
            </div>
          </div>

          {events.length ? (
            <div className="event-list">
              {events.map(({ event }) => (
                <article className="event-card" key={event.id}>
                  <div className="section-header">
                    <div>
                      <h3>{event.title}</h3>
                      <p className="copy-muted">{event.details}</p>
                    </div>
                    <span className={`chip ${event.attendeesAmount >= event.maximumAttendees ? "warning" : "success"}`}>
                      {event.attendeesAmount}/{event.maximumAttendees}
                    </span>
                  </div>

                  <div className="event-meta">
                    <span className="chip">slug: {event.slug}</span>
                    <span className="chip">capacidade: {event.maximumAttendees}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhum evento foi cadastrado ainda.</div>
          )}
        </div>

        <aside className="panel padded">
          <div className="section-header">
            <div>
              <h2>O que foi incluido</h2>
              <p className="copy-muted">Camadas novas para deixar a plataforma mais completa.</p>
            </div>
          </div>

          <div className="stack-list">
            <div className="info-card">
              <strong>Controle de kit</strong>
              <p className="copy-muted">Cada inscricao agora guarda o status de entrega do kit de boas-vindas.</p>
            </div>
            <div className="info-card">
              <strong>Dois acessos</strong>
              <p className="copy-muted">Admin e participante entram com Google e veem apenas o que faz sentido.</p>
            </div>
            <div className="info-card">
              <strong>Reclamacoes</strong>
              <p className="copy-muted">Participantes registram problemas e o administrador acompanha tudo no painel.</p>
            </div>
            <div className="info-card">
              <strong>Confirmacao por e-mail</strong>
              <p className="copy-muted">Cada nova inscricao dispara um fluxo de confirmacao configuravel por API.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
