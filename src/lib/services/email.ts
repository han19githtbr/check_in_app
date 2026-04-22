import { readDb, writeDb } from "@/lib/db";

type RegistrationEmailInput = {
  to: string;
  attendeeName: string;
  eventTitle: string;
  eventDetails: string;
};

async function logEmailDelivery(input: {
  to: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  provider: string;
  errorMessage?: string | null;
}) {
  const database = await readDb();

  database.emailLogs.push({
    id: crypto.randomUUID(),
    to: input.to,
    subject: input.subject,
    status: input.status,
    provider: input.provider,
    errorMessage: input.errorMessage ?? null,
    createdAt: new Date().toISOString()
  });

  await writeDb(database);
}

export async function sendRegistrationConfirmationEmail(input: RegistrationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const subject = `Inscricao confirmada: ${input.eventTitle}`;

  if (!apiKey || !from) {
    await logEmailDelivery({
      to: input.to,
      subject,
      status: "skipped",
      provider: "resend",
      errorMessage: "RESEND_API_KEY ou EMAIL_FROM nao configurados."
    });
    return;
  }

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;background:#07111f;color:#f5f7fb;padding:24px">
      <h1 style="margin:0 0 16px;color:#86efac">Inscricao confirmada</h1>
      <p>Ola, ${input.attendeeName}.</p>
      <p>Sua inscricao no evento <strong>${input.eventTitle}</strong> foi registrada com sucesso.</p>
      <p>${input.eventDetails}</p>
      <p style="margin-top:24px;color:#a8b3c7">Nos vemos no evento.</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();

      await logEmailDelivery({
        to: input.to,
        subject,
        status: "failed",
        provider: "resend",
        errorMessage: errorBody
      });

      return;
    }

    await logEmailDelivery({
      to: input.to,
      subject,
      status: "sent",
      provider: "resend"
    });
  } catch (error) {
    await logEmailDelivery({
      to: input.to,
      subject,
      status: "failed",
      provider: "resend",
      errorMessage: error instanceof Error ? error.message : "Falha desconhecida ao enviar e-mail."
    });
  }
}
