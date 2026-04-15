import { fetchConstructionBids } from './src/lib/koneps';
import { format, subMonths } from 'date-fns';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const startDate = format(sixMonthsAgo, 'yyyyMMdd') + '0000';
    const endDate = format(now, 'yyyyMMdd') + '2359';
    
    console.log(`startDate: ${startDate}, endDate: ${endDate}`);
    
    try {
        const result = await fetchConstructionBids(startDate, endDate);
        console.log(`Result count: ${result.length}`);
        if(result.length > 0) {
            console.log(result[0]);
        }
    } catch (e) {
        console.error(e);
    }
}

main();
