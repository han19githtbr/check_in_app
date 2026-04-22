"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  complaintId: string;
  resolved: boolean;
};

export function ComplaintStatusToggle({ complaintId, resolved }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);

    try {
      await fetch(`/api/complaints/${complaintId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resolved: !resolved
        })
      });

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="button-secondary" disabled={pending} onClick={handleToggle} type="button">
      {pending ? "Atualizando..." : resolved ? "Reabrir reclamacao" : "Resolver reclamacao"}
    </button>
  );
}
