import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'


export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    try {
        const body = await req.json()
        const { name, address, contacts, remarks } = body

        if (!name || !name.trim()) {
            return NextResponse.json({ error: '거래처 이름은 필수입니다.' }, { status: 400 })
        }

        const customer = await prisma.customer.create({
            data: {
                name: name.trim(),
                address: address?.trim() || null,
                contacts: contacts ? JSON.stringify(contacts) : null,
                remarks: remarks?.trim() || null,
            },
        })

        return NextResponse.json(customer, { status: 201 })
    } catch (error) {
        console.error('거래처 생성 오류:', error)
        return NextResponse.json({ error: '거래처 생성에 실패했습니다.' }, { status: 500 })
    }
}
