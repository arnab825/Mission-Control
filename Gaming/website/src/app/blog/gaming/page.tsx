import BlogListing from "../page";

export const revalidate = 60;

export default async function GamingBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string; page?: string }>;
}) {
  return <BlogListing searchParams={searchParams} />;
}
