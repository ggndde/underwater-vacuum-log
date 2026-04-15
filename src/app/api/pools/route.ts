import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { fetchConstructionBids } from '@/lib/koneps';
import { subMonths, format } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    // Default to last 6 months for construction lookup to avoid massive queries
    const sixMonthsAgo = subMonths(now, 6);

    const startDate = searchParams.get('startDate') || format(sixMonthsAgo, 'yyyyMMdd') + '0000';
    const endDate = searchParams.get('endDate') || format(now, 'yyyyMMdd') + '2359';

    console.log(`Fetching pool construction bids from ${startDate} to ${endDate}`);

    try {
        const items = await fetchConstructionBids(startDate, endDate);
        return NextResponse.json({ count: items.length, items });
    } catch (error) {
        console.error('Error in pools API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch construction bids' },
            { status: 500 }
        );
    }
}
