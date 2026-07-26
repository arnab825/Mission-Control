import { NextResponse } from 'next/server';
import { BENCHMARK_PROFILES, TESTED_GAMES_LIST, getBenchmarkProfileById } from '@/data/benchmarks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const profile = getBenchmarkProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: 'Benchmark profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  }

  return NextResponse.json({
    profiles: BENCHMARK_PROFILES,
    testedGames: TESTED_GAMES_LIST
  });
}
