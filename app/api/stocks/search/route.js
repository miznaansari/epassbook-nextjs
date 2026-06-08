import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/requireUser';

const FINNHUB_API_KEY = 'd8jcokhr01qh6g3phto0d8jcokhr01qh6g3phtog';

export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ result: [] });
    }

    const finnhubUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(finnhubUrl);
    
    if (!response.ok) {
      console.error('Finnhub search response error:', response.statusText);
      return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
    }

    const data = await response.json();
    
    // Format and return results
    const results = (data.result || [])
      .filter(item => item.symbol && item.description)
      .map(item => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type || 'Common Stock',
      }));

    return NextResponse.json({ result: results });
  } catch (error) {
    console.error('Error in /api/stocks/search GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
