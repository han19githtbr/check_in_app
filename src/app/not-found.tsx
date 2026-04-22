import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Nao encontrado</span>
        <h1>O recurso solicitado nao existe nesta base.</h1>
        <p>Confira o identificador informado ou volte para o painel principal para continuar o fluxo.</p>

        <div className="actions">
          <Link className="button" href="/">
            Voltar ao inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
