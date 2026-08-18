import BlogListing from "../page";

export default async function GamingBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string; page?: string }>;
}) {
  return <BlogListing searchParams={searchParams} />;
}
