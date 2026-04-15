export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { fetchAllBids } from '@/lib/koneps';
import { subMonths, format } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const oneMonthAgo = subMonths(now, 1);

    const startDate = searchParams.get('startDate') || format(oneMonthAgo, 'yyyyMMdd') + '0000';
    const endDate = searchParams.get('endDate') || format(now, 'yyyyMMdd') + '2359';

    console.log(`Fetching bids from ${startDate} to ${endDate}`);

    try {
        const items = await fetchAllBids(startDate, endDate);
        return NextResponse.json({ count: items.length, items });
    } catch (error) {
        console.error('Error in bids API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch bids' },
            { status: 500 }
        );
    }
}
