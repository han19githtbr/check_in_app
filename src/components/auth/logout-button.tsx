"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });

      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="button-secondary" disabled={pending} onClick={handleLogout} type="button">
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}
