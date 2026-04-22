import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { createEvent, listEvents } from "@/lib/services/events";

export async function GET() {
  try {
    const events = await listEvents();
    return NextResponse.json({ events });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const response = await createEvent(body);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
