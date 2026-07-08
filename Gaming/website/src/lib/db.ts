import fs from "fs/promises";
import path from "path";

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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "issues.json");

// Dynamic mock data to seed the database if it doesn't exist
const INITIAL_MOCK_ISSUES: Issue[] = [];

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      // Seed with initial mock issues if file does not exist
      await fs.writeFile(DATA_FILE, JSON.stringify(INITIAL_MOCK_ISSUES, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Failed to initialize database folder/file:", error);
  }
}

export async function getIssues(): Promise<Issue[]> {
  await ensureDataFile();
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content) as Issue[];
  } catch (error) {
    console.error("Error reading issues database:", error);
    return [];
  }
}

export async function saveIssues(issues: Issue[]): Promise<boolean> {
  await ensureDataFile();
  try {
    // Write atomically using a temporary file
    const tempFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(issues, null, 2), "utf-8");
    await fs.rename(tempFile, DATA_FILE);
    return true;
  } catch (error) {
    console.error("Error writing to issues database:", error);
    return false;
  }
}

export async function createIssue(
  issueData: Omit<Issue, "id" | "votes" | "createdAt">
): Promise<Issue | null> {
  const issues = await getIssues();
  
  const newIssue: Issue = {
    ...issueData,
    id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    votes: 1, // Automatic first vote from creator
    createdAt: new Date().toISOString(),
  };

  issues.push(newIssue);
  const success = await saveIssues(issues);
  return success ? newIssue : null;
}

export async function voteIssue(id: string): Promise<Issue | null> {
  const issues = await getIssues();
  const issueIndex = issues.findIndex((i) => i.id === id);
  
  if (issueIndex === -1) {
    return null;
  }

  issues[issueIndex].votes += 1;
  const success = await saveIssues(issues);
  return success ? issues[issueIndex] : null;
}
