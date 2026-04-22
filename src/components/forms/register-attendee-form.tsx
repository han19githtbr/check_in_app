"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  eventId: string;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
  attendeeId?: string;
} | null;

export function RegisterAttendeeForm({ eventId }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? "")
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Nao foi possivel concluir a inscricao.");
      }

      setFeedback({
        type: "success",
        message: "Inscricao confirmada com sucesso. O e-mail de confirmacao foi processado.",
        attendeeId: data.attendeeId
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Falha inesperada ao inscrever participante."
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className="form-stack"
      action={async (formData) => {
        await handleSubmit(formData);
      }}
    >
      <div className="field">
        <label htmlFor="name">Nome completo</label>
        <input id="name" name="name" placeholder="Pessoa participante" required />
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="email@empresa.com" required />
      </div>

      <div className="actions">
        <button className="button" disabled={isPending} type="submit">
          {isPending ? "Inscrevendo..." : "Registrar participante"}
        </button>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.type}`}>
          <span>{feedback.message}</span>
          {feedback.attendeeId ? (
            <>
              {" "}
              <Link className="inline-link" href={`/attendees/${feedback.attendeeId}/badge`}>
                Abrir cracha
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
