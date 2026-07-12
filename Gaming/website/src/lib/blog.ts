import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "content/blog");

export function parseBlogDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  
  let str = String(dateStr);
  
  // Clean string and check for IST timezone
  let cleanStr = str.trim();
  let isIST = false;
  if (cleanStr.toUpperCase().endsWith("IST")) {
    isIST = true;
    cleanStr = cleanStr.substring(0, cleanStr.length - 3).trim();
  }
  
  // Try standard ISO-8601 or other standard parsing first (e.g. yyyy-mm-dd)
  if (cleanStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      if (isIST) {
        // Adjust for IST (subtract 5.5 hours to convert from local to UTC)
        return new Date(d.getTime() - 5.5 * 60 * 60 * 1000);
      }
      return d;
    }
  }
  
  // Match dd/mm/yyyy hh:mm or dd/mm/yyyy
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/;
  const match = cleanStr.match(regex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    
    if (isIST) {
      const utcTime = Date.UTC(year, month, day, hour, minute) - (5.5 * 60 * 60 * 1000);
      return new Date(utcTime);
    } else {
      return new Date(year, month, day, hour, minute);
    }
  }
  
  const finalFallback = new Date(dateStr);
  return isNaN(finalFallback.getTime()) ? new Date() : finalFallback;
}

export function formatDateToIST(dateString: string): string {
  if (!dateString) return "";
  const d = parseBlogDate(dateString);
  
  // Format to IST
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const formatted = formatter.format(d); // e.g. "29/06/2026, 05:30"
  return formatted.replace(', ', ' ') + ' IST';
}

export type BlogCategory =
  | "Game News"
  | "GPU News"
  | "Game Revisit"
  | "Hardware Deep-Dive"
  | "Mission Brief";

export interface BlogPostData {
  id: string;
  title: string;
  date: string;
  author?: string;
  excerpt?: string;
  category?: BlogCategory;
  tags?: string[];
  coverImage?: string;
  aiGenerated?: boolean;
}

export function getSortedPostsData(category?: BlogCategory | "all"): BlogPostData[] {
  if (!fs.existsSync(contentDirectory)) return [];
  const fileNames = fs.readdirSync(contentDirectory);
  const now = new Date();
  const allPostsData = fileNames
    .filter((f) => f.endsWith(".mdx"))
    .map((fileName) => {
      const id = fileName.replace(/\.mdx$/, "");
      const fullPath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const matterResult = matter(fileContents);
      const data = matterResult.data as Omit<BlogPostData, "id" | "author">;
      return { 
        id, 
        author: matterResult.data.author || "Mission Control Intel",
        ...data 
      };
    })
    .filter((p) => parseBlogDate(p.date) <= now); // Post scheduler: hide future posts

  const filtered =
    category && category !== "all"
      ? allPostsData.filter((p) => p.category === category)
      : allPostsData;

  return filtered.sort((a, b) => (parseBlogDate(a.date).getTime() < parseBlogDate(b.date).getTime() ? 1 : -1));
}

export function getGamingPosts(): BlogPostData[] {
  return getSortedPostsData().filter(
    (p) =>
      p.category === "Game News" ||
      p.category === "GPU News" ||
      p.category === "Game Revisit" ||
      p.category === "Hardware Deep-Dive"
  );
}

export function getPostData(id: string) {
  const fullPath = path.join(contentDirectory, `${id}.mdx`);
  if (!fs.existsSync(fullPath)) return null;
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const matterResult = matter(fileContents);
  const data = matterResult.data as Omit<BlogPostData, "id" | "author">;
  return {
    id,
    content: matterResult.content,
    author: matterResult.data.author || "Mission Control Intel",
    ...data,
  };
}
