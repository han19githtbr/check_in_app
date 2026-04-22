"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  attendeeId?: string | null;
  eventId?: string | null;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export function ComplaintForm({ attendeeId, eventId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attendeeId,
          eventId,
          message: String(formData.get("message") ?? "")
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Nao foi possivel enviar sua reclamacao.");
      }

      setFeedback({
        type: "success",
        message: "Reclamacao enviada para o administrador."
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Falha ao registrar sua reclamacao."
      });
    } finally {
      setPending(false);
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
        <label htmlFor={`message-${attendeeId ?? "general"}`}>Reclame</label>
        <textarea
          id={`message-${attendeeId ?? "general"}`}
          name="message"
          rows={4}
          placeholder="Ex.: nao recebi meu kit de boas-vindas."
          required
        />
      </div>

      <div className="actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Enviando..." : "Enviar reclamacao"}
        </button>
      </div>

      {feedback ? <p className={`feedback ${feedback.type}`}>{feedback.message}</p> : null}
    </form>
  );
}
