import { NextResponse } from "next/server";
import { voteIssue } from "@/lib/db";
import { IssueVoteSchema, validateRequestBody, handleApiError } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = validateRequestBody(IssueVoteSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { issueId } = validation.data;
    const updatedIssue = await voteIssue(issueId);

    if (!updatedIssue) {
      return NextResponse.json(
        { error: "Specified issue not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, issue: updatedIssue });
  } catch (error: unknown) {
    return handleApiError("POST /api/issues/vote", error, 500, "Failed to register vote.");
  }
}
