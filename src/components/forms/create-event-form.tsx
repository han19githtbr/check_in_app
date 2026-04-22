"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export function CreateEventForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setFeedback(null);

    const payload = {
      title: String(formData.get("title") ?? ""),
      details: String(formData.get("details") ?? ""),
      maximumAttendees: Number(formData.get("maximumAttendees") ?? 0)
    };

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Nao foi possivel criar o evento.");
      }

      setFeedback({
        type: "success",
        message: "Evento criado com sucesso. A lista foi atualizada."
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Falha inesperada ao criar o evento."
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
        <label htmlFor="title">Nome do evento</label>
        <input id="title" name="title" placeholder="Summit de Inovacao 2026" required />
      </div>

      <div className="field">
        <label htmlFor="details">Descricao</label>
        <textarea
          id="details"
          name="details"
          rows={5}
          placeholder="Descreva a proposta, o publico esperado e a experiencia do encontro."
          required
        />
      </div>

      <div className="field">
        <label htmlFor="maximumAttendees">Capacidade maxima</label>
        <input id="maximumAttendees" name="maximumAttendees" type="number" min="1" required />
      </div>

      <div className="actions">
        <button className="button" disabled={isPending} type="submit">
          {isPending ? "Criando..." : "Criar evento"}
        </button>
      </div>

      {feedback ? <p className={`feedback ${feedback.type}`}>{feedback.message}</p> : null}
    </form>
  );
}
