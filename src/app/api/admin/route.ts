import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/events";

export async function GET() {
  try {
    await requireAdminSession();
    const dashboard = await getAdminDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    return handleRouteError(error);
  }
}
