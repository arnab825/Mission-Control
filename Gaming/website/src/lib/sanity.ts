import { createClient } from 'next-sanity';

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dummy-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-06-07',
  useCdn: false,
});

// Write client — uses SANITY_API_TOKEN (Editor role), server-side only
export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dummy-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-06-07',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function fetchDocs() {
  const query = `*[_type == "doc"] | order(order asc) {
    _id,
    title,
    slug,
    category,
    content,
    order
  }`;

  try {
    return await sanityClient.fetch(query);
  } catch (error) {
    console.error("Failed to fetch docs from Sanity. Make sure you have initialized the Sanity project and provided valid NEXT_PUBLIC_SANITY_PROJECT_ID.", error);
    return [];
  }
}

export async function fetchDocBySlug(slug: string) {
  const query = `*[_type == "doc" && slug.current == $slug][0]`;
  try {
    return await sanityClient.fetch(query, { slug });
  } catch (error) {
    console.error("Failed to fetch doc", error);
    return null;
  }
}

export interface SanityGamingPost {
  _id: string;
  title: string;
  slug: { current: string };
  category: string;
  excerpt?: string;
  markdownBody: string;
  mainImage?: any;
  tags?: string[];
  author?: string;
  aiGenerated?: boolean;
  publishedAt: string;
}

export async function fetchGamingPosts(category?: string): Promise<SanityGamingPost[]> {
  const filter = category && category !== 'all'
    ? `_type == "gamingPost" && category == $category && publishedAt <= now()`
    : `_type == "gamingPost" && publishedAt <= now()`;
  const query = `*[${filter}] | order(publishedAt desc) {
    _id, title, slug, category, excerpt, tags, author, aiGenerated, publishedAt, mainImage
  }`;
  try {
    return await sanityClient.fetch(query, category && category !== 'all' ? { category } : {});
  } catch (error) {
    console.error("Failed to fetch gaming posts", error);
    return [];
  }
}

export async function fetchGamingPostBySlug(slug: string): Promise<SanityGamingPost | null> {
  const query = `*[_type == "gamingPost" && slug.current == $slug && publishedAt <= now()][0]`;
  try {
    return await sanityClient.fetch(query, { slug });
  } catch (error) {
    console.error("Failed to fetch gaming post", error);
    return null;
  }
}
