import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 300 },
    });
    const data = await res.json();

    if (data?.data?.[0]) {
      const item = data.data[0];
      return NextResponse.json({
        value: parseInt(item.value),
        classification: item.value_classification,
        timestamp: item.timestamp,
      });
    }

    return NextResponse.json({ value: 50, classification: 'Neutral', timestamp: '' });
  } catch {
    return NextResponse.json({ value: 50, classification: 'Neutral', timestamp: '' });
  }
}
