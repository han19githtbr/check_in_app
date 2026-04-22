import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { logout } from "@/lib/auth";

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
