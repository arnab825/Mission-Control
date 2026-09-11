import { NextResponse } from 'next/server';
import { getBenchmarksFromDB, getBenchmarkByIdFromDB } from '@/lib/benchmarks-db';
import { handleApiError } from '@/lib/api-validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const cleanId = id.trim().slice(0, 100);
      const profile = await getBenchmarkByIdFromDB(cleanId);
      if (!profile) {
        return NextResponse.json({ error: 'Benchmark profile not found' }, { status: 404 });
      }
      return NextResponse.json(profile);
    }

    const data = await getBenchmarksFromDB();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("GET /api/benchmarks", error, 500, "Failed to retrieve benchmarks.");
  }
}
