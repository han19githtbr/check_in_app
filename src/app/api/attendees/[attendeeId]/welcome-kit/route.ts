import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { markWelcomeKitDelivery } from "@/lib/services/attendees";

type RouteContext = {
  params: Promise<{
    attendeeId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { attendeeId } = await context.params;
    const body = (await request.json()) as { delivered?: boolean };
    const response = await markWelcomeKitDelivery(attendeeId, Boolean(body.delivered));

    return NextResponse.json(response);
  } catch (error) {
    return handleRouteError(error);
  }
}
