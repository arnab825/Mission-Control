import { NextResponse } from "next/server";
import { getIssues, createIssue } from "@/lib/db";

export async function GET() {
  try {
    const issues = await getIssues();
    // Sort issues by votes descending, then latest first
    const sortedIssues = [...issues].sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return NextResponse.json(sortedIssues);
  } catch (error: any) {
    console.error("Error in GET /api/issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, game, specs } = body;

    // Server-side validation
    if (!title || !description || !category || !specs) {
      return NextResponse.json(
        { error: "Missing required fields. title, description, category, and specs are required." },
        { status: 400 }
      );
    }

    if (!specs.os || !specs.osVersion || !specs.cpu || !specs.gpu || !specs.ramGB || !specs.appVersion) {
      return NextResponse.json(
        { error: "Incomplete specs fields. os, osVersion, cpu, gpu, ramGB, and appVersion are required." },
        { status: 400 }
      );
    }

    const newIssue = await createIssue({
      title,
      description,
      category,
      game: game || "General System",
      specs: {
        os: specs.os,
        osVersion: specs.osVersion,
        cpu: specs.cpu,
        gpu: specs.gpu,
        gpuDriver: specs.gpuDriver || "Unknown",
        ramGB: Number(specs.ramGB),
        appVersion: specs.appVersion,
      },
    });

    if (!newIssue) {
      return NextResponse.json(
        { error: "Failed to write issue to database" },
        { status: 500 }
      );
    }

    return NextResponse.json(newIssue, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/issues:", error);
    return NextResponse.json(
      { error: "Failed to create issue", details: error.message },
      { status: 500 }
    );
  }
}
