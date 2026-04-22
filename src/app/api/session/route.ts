import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json(session);
  } catch (error) {
    return handleRouteError(error);
  }
}
