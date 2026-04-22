import { NextResponse } from "next/server";

import { getEventAttendees } from "@/lib/services/attendees";
import { handleRouteError } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const attendees = await getEventAttendees(id);
    return NextResponse.json(attendees);
  } catch (error) {
    return handleRouteError(error);
  }
}
