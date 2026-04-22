import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { resolveComplaint } from "@/lib/services/portal";

type RouteContext = {
  params: Promise<{
    complaintId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { complaintId } = await context.params;
    const body = (await request.json()) as { resolved?: boolean };
    const response = await resolveComplaint(complaintId, Boolean(body.resolved));

    return NextResponse.json(response);
  } catch (error) {
    return handleRouteError(error);
  }
}
