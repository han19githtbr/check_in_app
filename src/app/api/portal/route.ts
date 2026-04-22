import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireUserSession } from "@/lib/auth";
import { getParticipantDashboard } from "@/lib/services/portal";

export async function GET() {
  try {
    const { user } = await requireUserSession();
    const dashboard = await getParticipantDashboard({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    return handleRouteError(error);
  }
}
