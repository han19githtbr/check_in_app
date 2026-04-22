"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  attendeeId: string;
  checkedInAt: string | null;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export function CheckInButton({ attendeeId, checkedInAt }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function handleCheckIn() {
    setIsPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/attendees/${attendeeId}/check-in`, {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Nao foi possivel registrar o check-in.");
      }

      setFeedback({
        type: "success",
        message: "Check-in registrado com sucesso."
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Falha inesperada ao registrar check-in."
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="actions">
        <button className="button" disabled={isPending || Boolean(checkedInAt)} onClick={handleCheckIn} type="button">
          {checkedInAt ? "Check-in realizado" : isPending ? "Registrando..." : "Confirmar check-in"}
        </button>
      </div>

      {feedback ? <p className={`feedback ${feedback.type}`}>{feedback.message}</p> : null}
    </>
  );
}
