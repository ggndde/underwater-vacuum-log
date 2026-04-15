export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
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
