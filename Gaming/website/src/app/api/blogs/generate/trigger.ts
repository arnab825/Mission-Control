import "./loadenv";
import { POST } from "./route";


async function run() {
  // Dynamically calculate the last 4 calendar days (including today) in YYYY-MM-DD format
  const dates: string[] = [];
  const today = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  console.log(`[Trigger] Dynamically generated catch-up dates:`, dates);

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
