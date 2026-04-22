import { NextResponse } from "next/server";

import { createGoogleAuthorizationUrl } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import type { UserRole } from "@/types/domain";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    if (roleParam !== "admin" && roleParam !== "participant") {
      throw new AppError("Tipo de acesso invalido.", 400);
    }

    const url = await createGoogleAuthorizationUrl(roleParam as UserRole);
    return NextResponse.redirect(url);
  } catch (error) {
    return handleRouteError(error);
  }
}
