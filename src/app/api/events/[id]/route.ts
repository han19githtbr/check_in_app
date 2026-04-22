import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { getEventDetail } from "@/lib/services/events";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const event = await getEventDetail(id);
    return NextResponse.json(event);
  } catch (error) {
    return handleRouteError(error);
  }
}
