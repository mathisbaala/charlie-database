// charlie-live/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchEntreprises } from '../../../lib/datagouv';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchEntreprises(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json({ error: 'Erreur recherche entreprises' }, { status: 500 });
  }
}
