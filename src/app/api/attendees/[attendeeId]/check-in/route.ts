import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { checkInAttendee } from "@/lib/services/attendees";

type RouteContext = {
  params: Promise<{
    attendeeId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { attendeeId } = await context.params;
    await checkInAttendee(attendeeId);
    return NextResponse.json(null, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
