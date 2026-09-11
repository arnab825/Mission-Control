import { NextResponse } from "next/server";
import { getIssues, createIssue } from "@/lib/db";
import { IssueCreateSchema, validateRequestBody, handleApiError } from "@/lib/api-validation";

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
  } catch (error: unknown) {
    return handleApiError("GET /api/issues", error, 500, "Failed to fetch issues.");
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = validateRequestBody(IssueCreateSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { title, description, category, game, author, specs } = validation.data;

    const newIssue = await createIssue({
      title,
      description,
      category,
      game,
      author,
      specs: {
        os: specs.os,
        osVersion: specs.osVersion,
        cpu: specs.cpu,
        gpu: specs.gpu,
        gpuDriver: specs.gpuDriver,
        ramGB: specs.ramGB,
        appVersion: specs.appVersion,
      },
    });

    if (!newIssue) {
      return NextResponse.json(
        { error: "Failed to record issue into registry." },
        { status: 500 }
      );
    }

    return NextResponse.json(newIssue, { status: 201 });
  } catch (error: unknown) {
    return handleApiError("POST /api/issues", error, 500, "Failed to create issue.");
  }
}
