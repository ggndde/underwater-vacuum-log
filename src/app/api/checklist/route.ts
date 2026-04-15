import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'


export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const fd = await req.formData()

    const companyName = fd.get('companyName') as string
    const hasDelivery = fd.get('hasDelivery') === 'true'
    const hasCrmUpdate = fd.get('hasCrmUpdate') === 'true'

    const deliveryCarrier = fd.has('deliveryCarrier') ? fd.get('deliveryCarrier') as string : null
    const deliveryItems = fd.has('deliveryItems') ? fd.get('deliveryItems') as string : null
    const deliverySent = fd.has('deliverySent') ? parseTriState(fd.get('deliverySent')) : null

    const crmUpdated = fd.has('crmUpdated') ? parseTriState(fd.get('crmUpdated')) : null
    const poolInfoUpdated = fd.has('poolInfoUpdated') ? parseTriState(fd.get('poolInfoUpdated')) : null
    const quoteSent = fd.has('quoteSent') ? parseTriState(fd.get('quoteSent')) : null
    const photosAttached = fd.has('photosAttached') ? parseTriState(fd.get('photosAttached')) : null
    const paymentUpdated = fd.has('paymentUpdated') ? parseTriState(fd.get('paymentUpdated')) : null
    const naverWorksLogged = fd.has('naverWorksLogged') ? parseTriState(fd.get('naverWorksLogged')) : null
    
    // Will be auto-calculated on patch if completed, or just directly set if provided
    const completed = fd.has('completed') ? fd.get('completed') === 'true' : false

    const checklist = await (prisma as any).workChecklist.create({
        data: {
            companyName,
            hasDelivery,
            hasCrmUpdate,
            deliveryCarrier,
            deliveryItems,
            deliverySent,
            crmUpdated,
            poolInfoUpdated,
            quoteSent,
            photosAttached,
            paymentUpdated,
            naverWorksLogged,
            completed,
            createdBy: session?.user?.name || '',
        }
    })

    revalidatePath('/checklist')
    return NextResponse.json({ id: checklist.id })
}

// 'true' → true, 'false' → false, 'null' → null
function parseTriState(val: FormDataEntryValue | null): boolean | null {
    if (val === 'true') return true
    if (val === 'false') return false
    return null
}

const CRM_KEYS = ['crmUpdated', 'quoteSent', 'photosAttached', 'paymentUpdated', 'naverWorksLogged']
const isHandled = (v: boolean | null | undefined | unknown) => v === true || v === false

export async function PATCH(req: NextRequest) {
    const fd = await req.formData()
    const id = parseInt(fd.get('id') as string)

    const data: Record<string, unknown> = {}
    if (fd.has('deliveryCarrier')) data.deliveryCarrier = fd.get('deliveryCarrier') as string
    if (fd.has('deliveryItems')) data.deliveryItems = fd.get('deliveryItems') as string
    if (fd.has('deliverySent')) data.deliverySent = parseTriState(fd.get('deliverySent'))
    if (fd.has('crmUpdated')) data.crmUpdated = parseTriState(fd.get('crmUpdated'))
    if (fd.has('poolInfoUpdated')) data.poolInfoUpdated = parseTriState(fd.get('poolInfoUpdated'))
    if (fd.has('quoteSent')) data.quoteSent = parseTriState(fd.get('quoteSent'))
    if (fd.has('photosAttached')) data.photosAttached = parseTriState(fd.get('photosAttached'))
    if (fd.has('paymentUpdated')) data.paymentUpdated = parseTriState(fd.get('paymentUpdated'))
    if (fd.has('naverWorksLogged')) data.naverWorksLogged = parseTriState(fd.get('naverWorksLogged'))

    // 서버 사이드에서 자동으로 처리 완료 여부 계산 (Race Condition 방지)
    const current = await (prisma as any).workChecklist.findUnique({ where: { id } })
    if (current) {
        const merged = { ...current, ...data }

        let crmHandled = true
        if (merged.hasCrmUpdate) {
            // 풀 고객관리: 모든 CRM 키가 처리되어야 완료
            let keys = [...CRM_KEYS]
            if (merged.crmType === 'NEW') keys.push('poolInfoUpdated')
            crmHandled = keys.every(k => isHandled(merged[k]))
        } else if (merged.hasDelivery) {
            // 택배 단독: 일부 키(crmUpdated, quoteSent, photosAttached, paymentUpdated, naverWorksLogged)가 존재함
            const DELIVERY_CRM_KEYS = ['crmUpdated', 'quoteSent', 'photosAttached', 'paymentUpdated', 'naverWorksLogged']
            // hasCrmUpdate가 false이므로 이 키들을 체크함
            crmHandled = DELIVERY_CRM_KEYS.every(k => isHandled(merged[k]))
        }
    
        const deliveryHandled = merged.hasDelivery 
          ? isHandled(merged.deliverySent)
          : true
    
        data.completed = crmHandled && deliveryHandled
    }

    const updated = await (prisma as any).workChecklist.update({ where: { id }, data })
    revalidatePath('/checklist')
    return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
    const fd = await req.formData()
    const id = parseInt(fd.get('id') as string)
    await (prisma as any).workChecklist.delete({ where: { id } })
    revalidatePath('/checklist')
    return NextResponse.json({ ok: true })
}

export async function GET() {
    const kstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yyyy = kstDate.getFullYear();
    const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(kstDate.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const today = new Date(`${todayStr}T00:00:00+09:00`);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || ''

    const items = await (prisma as any).workChecklist.findMany({
        where: { 
            createdAt: { gte: today, lt: tomorrow },
            createdBy: userName
        },
        orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(items)
}
