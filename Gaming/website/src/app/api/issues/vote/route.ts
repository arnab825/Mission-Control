import { NextResponse } from "next/server";
import { voteIssue } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { issueId } = body;

    if (!issueId) {
      return NextResponse.json(
        { error: "Missing required field: issueId is required." },
        { status: 400 }
      );
    }

    const updatedIssue = await voteIssue(issueId);

    if (!updatedIssue) {
      return NextResponse.json(
        { error: `Issue with ID ${issueId} not found.` },
        { status: 444 }
      );
    }

    return NextResponse.json({ success: true, issue: updatedIssue });
  } catch (error: any) {
    console.error("Error in POST /api/issues/vote:", error);
    return NextResponse.json(
      { error: "Failed to submit vote", details: error.message },
      { status: 500 }
    );
  }
}
