import { NextResponse } from 'next/server';
import { getBenchmarksFromDB, getBenchmarkByIdFromDB } from '@/lib/benchmarks-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const profile = await getBenchmarkByIdFromDB(id);
      if (!profile) {
        return NextResponse.json({ error: 'Benchmark profile not found' }, { status: 404 });
      }
      return NextResponse.json(profile);
    }

    const data = await getBenchmarksFromDB();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/benchmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmarks', details: error.message },
      { status: 500 }
    );
  }
}
