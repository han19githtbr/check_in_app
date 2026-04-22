import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api";
import { requireUserSession } from "@/lib/auth";
import { createComplaint } from "@/lib/services/portal";

export async function POST(request: Request) {
  try {
    const { user } = await requireUserSession();
    const body = (await request.json()) as {
      attendeeId?: string | null;
      eventId?: string | null;
      message?: string;
    };

    const response = await createComplaint({
      userId: user.id,
      attendeeId: body.attendeeId ?? null,
      eventId: body.eventId ?? null,
      message: body.message ?? ""
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
