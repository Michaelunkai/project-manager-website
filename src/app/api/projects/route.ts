import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { listProjects } from "@/lib/catalog";
import { projectQuerySchema } from "@/lib/query-schema";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const identifier = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";

  if (!checkRateLimit(identifier, 90, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = projectQuerySchema.parse(params);
    const payload = await listProjects(query);

    return NextResponse.json({
      success: true,
      ...payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    console.error("Project catalog request failed:", error);
    return NextResponse.json({ error: "Unable to load the project catalog." }, { status: 500 });
  }
}
