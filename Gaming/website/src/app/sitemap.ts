import { MetadataRoute } from "next";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://mission-control-roan-seven.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/architecture`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/games-tested`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    await connectDB();
    const posts = await GamingPost.find({}, "slug updatedAt").lean();
    dynamicRoutes = posts.map((post: any) => ({
      url: `${baseUrl}/blog/gaming/${post.slug}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (e) {
    console.error("Sitemap dynamic route fetch warning:", e);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
