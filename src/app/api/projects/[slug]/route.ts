import { NextRequest, NextResponse } from "next/server";

import { getProjectBySlug, getRelatedProjects } from "@/lib/catalog";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const identifier = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";

  if (!checkRateLimit(identifier, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const { slug } = await context.params;
    const project = await getProjectBySlug(slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const related = await getRelatedProjects(project, 4);

    return NextResponse.json({
      success: true,
      project,
      related,
    });
  } catch (error) {
    console.error("Project detail request failed:", error);
    return NextResponse.json({ error: "Unable to load the project detail." }, { status: 500 });
  }
}
