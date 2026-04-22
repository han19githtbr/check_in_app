import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import type { ErrorResponse } from "@/types/domain";

export async function buildRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return undefined;
  }

  return `${protocol}://${host}`;
}

export function handleRouteError(error: unknown) {
  if (error instanceof AppError) {
    const body: ErrorResponse | null = error.message ? { message: error.message } : null;
    return NextResponse.json(body, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ message: "Erro interno do servidor." }, { status: 500 });
}
