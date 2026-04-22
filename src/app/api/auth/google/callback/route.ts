import { NextResponse } from "next/server";

import { resolveGoogleLogin } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  try {
    if (errorParam) {
      throw new AppError(`Login com Google cancelado: ${errorParam}.`, 400);
    }

    if (!code || !state) {
      throw new AppError("Callback do Google incompleto.", 400);
    }

    const user = await resolveGoogleLogin(code, state);
    const targetPath = user.role === "admin" ? "/admin" : "/my-area";

    return NextResponse.redirect(new URL(targetPath, appUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao autenticar com Google.";
    return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(message)}`, appUrl));
  }
}
