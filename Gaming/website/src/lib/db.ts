import connectDB from "./mongodb";
import IssueModel from "@/models/Issue";

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: "hardware" | "glitch" | "performance" | "other";
  game?: string;
  votes: number;
  createdAt: string;
  specs: {
    os: string;
    osVersion: string;
    cpu: string;
    gpu: string;
    gpuDriver?: string;
    ramGB: number;
    appVersion: string;
  };
}

export async function getIssues(): Promise<Issue[]> {
  try {
    await connectDB();
    const docs = await IssueModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map((doc: any) => ({
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      game: doc.game,
      votes: doc.votes,
      createdAt: doc.createdAt.toISOString(),
      specs: doc.specs,
    }));
  } catch (error) {
    console.error("Error fetching issues from MongoDB:", error);
    return [];
  }
}

export async function createIssue(
  issueData: Omit<Issue, "id" | "votes" | "createdAt">
): Promise<Issue | null> {
  try {
    await connectDB();
    const doc = await IssueModel.create({
      ...issueData,
      votes: 1, // Automatic first vote
    });
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      game: doc.game,
      votes: doc.votes,
      createdAt: doc.createdAt.toISOString(),
      specs: doc.specs,
    };
  } catch (error) {
    console.error("Error creating issue in MongoDB:", error);
    return null;
  }
}

export async function voteIssue(id: string): Promise<Issue | null> {
  try {
    await connectDB();
    const doc = await IssueModel.findByIdAndUpdate(
      id,
      { $inc: { votes: 1 } },
      { new: true }
    ).lean();

    if (!doc) {
      console.warn(`Issue with ID ${id} not found in MongoDB.`);
      return null;
    }

    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      game: doc.game,
      votes: doc.votes,
      createdAt: doc.createdAt.toISOString(),
      specs: doc.specs,
    };
  } catch (error) {
    console.error(`Error voting for issue ${id} in MongoDB:`, error);
    return null;
  }
}
