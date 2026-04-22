import { NextResponse } from "next/server";

import { buildRequestOrigin, handleRouteError } from "@/lib/api";
import { getAttendeeBadge } from "@/lib/services/attendees";
import { getBaseUrl } from "@/lib/utils";

type RouteContext = {
  params: Promise<{
    attendeeId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { attendeeId } = await context.params;
    const origin = (await buildRequestOrigin()) ?? getBaseUrl();
    const badge = await getAttendeeBadge(attendeeId, origin);
    return NextResponse.json(badge);
  } catch (error) {
    return handleRouteError(error);
  }
}
