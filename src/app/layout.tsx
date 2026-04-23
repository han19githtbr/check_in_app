import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";
import { LogoutButton } from "@/components/auth/logout-button";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pass.in Next",
  description: "Plataforma de eventos com login Google, area do participante, reclamacoes e controle de kits."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" href="/">
              <span className="brand-mark" />
              <div>
                <strong>Next Pass.in</strong>
                <small>Eventos, kits e atendimento em um fluxo mais elegante</small>
              </div>
            </Link>

            <div className="topbar-actions">
              {session.authenticated && session.user ? (
                <>
                  <div className="user-pill">
                    <span>{session.user.name}</span>
                    <small>{session.user.role === "admin" ? "Administrador" : "Participante"}</small>
                  </div>
                  <Link className="button-secondary" href={session.user.role === "admin" ? "/admin" : "/my-area"}>
                    Abrir painel
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <a className="button-secondary" href="/api/auth/google?role=participant">
                    Entrar como participante
                  </a>
                  <a className="button" href="/api/auth/google?role=admin">
                    Entrar como admin
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
