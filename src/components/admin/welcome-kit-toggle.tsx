"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  attendeeId: string;
  delivered: boolean;
};

export function WelcomeKitToggle({ attendeeId, delivered }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);

    try {
      await fetch(`/api/attendees/${attendeeId}/welcome-kit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          delivered: !delivered
        })
      });

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="button-secondary" disabled={pending} onClick={handleToggle} type="button">
      {pending ? "Atualizando..." : delivered ? "Remover entrega do kit" : "Marcar kit entregue"}
    </button>
  );
}
