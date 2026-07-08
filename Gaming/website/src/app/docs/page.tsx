import { getAllDocs } from "@/lib/docs";
import DocsClient from "./DocsClient";

export default function DocsPage() {
  const docs = getAllDocs();
  return <DocsClient docs={docs} />;
}
