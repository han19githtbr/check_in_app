import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireUserSession } from "@/lib/auth";
import { registerAttendeeOnEvent } from "@/lib/services/events";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const session = await requireUserSession().catch(() => null);
    const response = await registerAttendeeOnEvent(id, {
      ...body,
      userId: session?.user.id ?? body.userId ?? null
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
