import "./loadenv";
import { POST } from "./route";


async function run() {
  const dates = ["2026-07-16", "2026-07-17", "2026-07-18"];
  for (const date of dates) {
    console.log(`\n==================================================`);
    console.log(`[Trigger] Generating blog posts for date: ${date}`);
    console.log(`==================================================`);
    
    const mockRequest = {
      url: `http://localhost/api/blogs/generate?date=${date}`,
      headers: {
        get: (name: string) => null
      }
    } as any;

    try {
      const response = await POST(mockRequest);
      const data = await response.json();
      console.log(`[Trigger] Success for ${date}:`, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[Trigger] Failed for ${date}:`, err);
    }
  }
  console.log(`\n[Trigger] Complete!`);
}

run().catch(console.error);
