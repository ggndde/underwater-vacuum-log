'use server'

import { prisma } from '@/lib/prisma'
import type { Part } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'


export async function createServiceLog(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const customerId = parseInt(formData.get('customerId') as string)
    const machineId = formData.get('machineId') ? parseInt(formData.get('machineId') as string) : null

    // Find the machine associated with this customer
    const machine = machineId
        ? await prisma.machine.findUnique({ where: { id: machineId } })
        : await prisma.machine.findFirst({ where: { customerId } })

    if (!machine) {
        throw new Error('Machine not found for this customer')
    }

    const type = formData.get('type') as string
    const visitType = (formData.get('visitType') as string) || '유상'
    const hours = formData.get('hours') ? parseFloat(formData.get('hours') as string) : null
    const cycles = formData.get('cycles') ? parseInt(formData.get('cycles') as string) : null
    const errorCodes = formData.get('errors') as string
    const body = formData.get('body') as string
    const actionType = formData.get('actionType') as string

    // Settings
    const settingFront = formData.get('settingFront') as string
    const settingRear = formData.get('settingRear') as string
    const settingsChanges = formData.get('settingsChanges') as string
    const settingWidth = formData.get('settingWidth') as string
    const settingP = formData.get('settingP') as string

    // Create the log
    const log = await prisma.serviceLog.create({
        data: {
            date: new Date(),
            type,
            visitType,
            machineId: machine.id,
            technician: (formData.get('technician') as string) || '구길재',
            hours,
            cycles,
            errorCodes,
            body,
            actionType,
            settingFront,
            settingRear,
            settingWidth,
            settingP,
            settingsChanges
        }
    })

    revalidatePath(`/clients/${customerId}`)

    // If paid visit, redirect to quote creation; otherwise go back
    if (visitType === '유상') {
        redirect(`/clients/${customerId}/logs/${log.id}/quote`)
    } else {
        redirect(`/clients/${customerId}`)
    }
}

// ─── Homework Workflow Actions ──────────────────────────────────────────────

export async function createQuote(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const serviceLogId = parseInt(formData.get('serviceLogId') as string)
    const customerId = parseInt(formData.get('customerId') as string)
    const machineId = parseInt(formData.get('machineId') as string)
    const itemsJson = formData.get('items') as string
    const memo = (formData.get('memo') as string) || null

    // Parse items
    const items: Array<{ name: string; qty: number; unitPrice: number; amount: number }> =
        JSON.parse(itemsJson || '[]')
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0)
    const taxAmount = Math.round(totalAmount * 0.1)
    const grandTotal = totalAmount + taxAmount

    // Generate quoteNo: {고객명}-{N}호기({제품})-{YYMMDD}_{당일순번}
    const machine = await prisma.machine.findUnique({
        where: { id: machineId },
        include: { customer: true }
    })
    if (!machine) throw new Error('Machine not found')

    const now = new Date()
    const yy = String(now.getFullYear()).slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const dateStr = `${yy}${mm}${dd}`
    const prefix = `${machine.customer.name}-${machine.unitNo}호기(${machine.productType})-${dateStr}`

    // Count existing quotes with same prefix today to get sequence number
    const existingCount = await prisma.quote.count({
        where: { quoteNo: { startsWith: prefix } }
    })
    const quoteNo = `${prefix}_${existingCount + 1}`

    await prisma.quote.create({
        data: {
            quoteNo,
            serviceLogId,
            customerId,
            machineId,
            items: itemsJson,
            totalAmount,
            taxAmount,
            grandTotal,
            memo,
            createdBy: session?.user?.name || ''
        }
    })

    revalidatePath(`/clients/${customerId}`)
    redirect(`/clients/${customerId}/logs/${serviceLogId}/photos`)
}

export async function skipQuote(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const customerId = parseInt(formData.get('customerId') as string)
    const serviceLogId = parseInt(formData.get('serviceLogId') as string)
    revalidatePath(`/clients/${customerId}`)
    redirect(`/clients/${customerId}/logs/${serviceLogId}/photos`)
}

export async function confirmPhotos(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const serviceLogId = parseInt(formData.get('serviceLogId') as string)
    const customerId = parseInt(formData.get('customerId') as string)
    const confirmed = formData.get('photosConfirmed') === 'true'

    await prisma.serviceLog.update({
        where: { id: serviceLogId },
        data: { photosConfirmed: confirmed }
    })

    revalidatePath(`/clients/${customerId}`)
    redirect(`/clients/${customerId}/logs/${serviceLogId}/expense`)
}

export async function skipPhotos(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const customerId = parseInt(formData.get('customerId') as string)
    const serviceLogId = parseInt(formData.get('serviceLogId') as string)
    revalidatePath(`/clients/${customerId}`)
    redirect(`/clients/${customerId}/logs/${serviceLogId}/expense`)
}

export async function createExpense(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const serviceLogId = parseInt(formData.get('serviceLogId') as string)
    const customerId = parseInt(formData.get('customerId') as string)
    const quoteId = formData.get('quoteId') ? parseInt(formData.get('quoteId') as string) : null
    const amount = parseInt(formData.get('amount') as string) || 0
    const paymentType = formData.get('paymentType') as string
    const memo = (formData.get('memo') as string) || null

    // 현장카드결제 또는 무상이면 즉시 완납 처리
    const autoComplete = paymentType === '현장카드결제' || paymentType === '무상'
    const status = autoComplete ? '완납' : '미수'
    const paidDate = autoComplete ? new Date() : null
    const finalAmount = paymentType === '무상' ? 0 : amount

    await prisma.expense.create({
        data: {
            serviceLogId,
            customerId,
            quoteId,
            amount: finalAmount,
            paymentType,
            status,
            paidDate,
            memo
        }
    })

    revalidatePath(`/clients/${customerId}`)
    redirect(`/clients/${customerId}`)
}

export async function updateExpenseStatus(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const expenseId = parseInt(formData.get('expenseId') as string)
    const status = formData.get('status') as string
    const customerId = parseInt(formData.get('customerId') as string)

    await prisma.expense.update({
        where: { id: expenseId },
        data: {
            status,
            paidDate: status === '완납' ? new Date() : null
        }
    })

    revalidatePath(`/clients/${customerId}`)
}

// ─── Machine CRUD Actions ───────────────────────────────────────────────────

export async function upsertMachine(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const customerId = parseInt(formData.get('customerId') as string)
    const machineIdStr = formData.get('machineId') as string
    const machineId = machineIdStr ? parseInt(machineIdStr) : null

    const data = {
        modelName: formData.get('modelName') as string,
        serialNumber: formData.get('serialNumber') as string,
        productType: (formData.get('productType') as string) || 'CP',
        unitNo: parseInt(formData.get('unitNo') as string) || 1,
        poolSize: (formData.get('poolSize') as string) || null,
        obstacles: (formData.get('obstacles') as string) || null,
        floorType: (formData.get('floorType') as string) || null,
        purchaseDate: formData.get('purchaseDate')
            ? new Date(formData.get('purchaseDate') as string)
            : null,
        customerId
    }

    if (machineId) {
        await prisma.machine.update({ where: { id: machineId }, data })
    } else {
        await prisma.machine.create({ data })
    }

    revalidatePath(`/clients/${customerId}`)
    redirect(`/clients/${customerId}`)
}

export async function deleteMachine(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const machineId = parseInt(formData.get('machineId') as string)
    const customerId = parseInt(formData.get('customerId') as string)

    // ServiceLog cascade delete not supported in SQLite — delete manually
    await prisma.serviceLog.deleteMany({ where: { machineId } })
    await prisma.machine.delete({ where: { id: machineId } })

    revalidatePath(`/clients/${customerId}`)
}

// ─── Parts Inventory Actions ───────────────────────────────────────────────

export async function addPart(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const articleNo = formData.get('articleNo') as string
    const name = formData.get('name') as string
    const category = formData.get('category') as string || '공용'
    const stock = parseInt(formData.get('stock') as string) || 0

    await prisma.part.create({
        data: { articleNo, name, category, stock }
    })

    revalidatePath('/parts')
}

export async function updatePart(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const partId = parseInt(formData.get('partId') as string)
    const articleNo = formData.get('articleNo') as string
    const name = formData.get('name') as string
    const category = formData.get('category') as string || '공용'
    const stockStr = formData.get('stock') as string
    const stock = stockStr !== '' ? parseInt(stockStr) : undefined
    const thresholdStr = formData.get('lowStockThreshold') as string
    const lowStockThreshold = thresholdStr !== '' ? parseInt(thresholdStr) : undefined

    await prisma.part.update({
        where: { id: partId },
        data: {
            articleNo,
            name,
            category,
            ...(stock !== undefined ? { stock } : {}),
            ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {})
        }
    })

    revalidatePath('/parts')
}

export async function adjustStock(formData: FormData) {
    const session = await getServerSession(authOptions)
    const performedBy = session?.user?.name ?? ''

    const partId = parseInt(formData.get('partId') as string)
    const delta = parseInt(formData.get('delta') as string)
    const transactionType = formData.get('transactionType') as string
    const note = formData.get('note') as string || null

    const part = await prisma.part.findUnique({ where: { id: partId } })
    if (!part) throw new Error('Part not found')

    const newStock = part.stock + delta
    if (newStock < 0) throw new Error('재고가 부족합니다.')

    await prisma.$transaction([
        prisma.part.update({
            where: { id: partId },
            data: { stock: newStock }
        }),
        prisma.stockTransaction.create({
            data: { partId, delta, transactionType, note, performedBy }
        })
    ])

    revalidatePath('/parts')
}

export async function batchAdjustStock(formData: FormData) {
    const session = await getServerSession(authOptions)
    const performedBy = session?.user?.name ?? ''

    const itemsJson = formData.get('items') as string
    const items: Array<{ partId: number; delta: number; transactionType: string; note: string }> =
        JSON.parse(itemsJson)

    if (!items.length) return

    // Fetch current stock for all parts
    const partIds = items.map(i => i.partId)
    const partsInDB = await prisma.part.findMany({ where: { id: { in: partIds } } }) as { id: number; name: string; stock: number }[]
    const stockMap = new Map<number, number>(partsInDB.map(p => [p.id, p.stock] as [number, number]))

    // Validate
    for (const item of items) {
        const cur: number = stockMap.get(item.partId) ?? 0
        if (cur + item.delta < 0) {
            const part = partsInDB.find((p: { id: number; name: string }) => p.id === item.partId)
            throw new Error(`재고 부족: ${part?.name ?? item.partId} (현재 ${cur}개)`)
        }
    }

    // Execute in a single transaction
    await prisma.$transaction([
        ...items.map(item =>
            prisma.part.update({
                where: { id: item.partId },
                data: { stock: { increment: item.delta } },
            })
        ),
        ...items.map(item =>
            prisma.stockTransaction.create({
                data: {
                    partId: item.partId,
                    delta: item.delta,
                    transactionType: item.transactionType,
                    note: item.note || null,
                    performedBy,
                },
            })
        ),
    ])

    revalidatePath('/parts')
}

export async function changePIN(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const currentPin = formData.get('currentPin') as string
    const newPin = formData.get('newPin') as string

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        throw new Error('PIN은 4자리 숫자여야 합니다.')
    }

    const employee = await prisma.employee.findUnique({ where: { name: session.user.name } })
    if (!employee) throw new Error('직원을 찾을 수 없습니다.')

    const isValid = await bcrypt.compare(currentPin, employee.hashedPin)
    if (!isValid) throw new Error('현재 PIN이 올바르지 않습니다.')

    const hashedNew = await bcrypt.hash(newPin, 10)
    await prisma.employee.update({
        where: { name: session.user.name },
        data: { hashedPin: hashedNew }
    })
}

export async function deletePart(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const partId = parseInt(formData.get('partId') as string)
    await prisma.stockTransaction.deleteMany({ where: { partId } })
    await prisma.part.delete({ where: { id: partId } })
    revalidatePath('/parts')
}

// ─── Delivery Calendar Actions ──────────────────────────────────────────────

export async function createDelivery(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const performedBy = (formData.get('performedBy') as string) || session.user.name

    const dateStr = formData.get('date') as string
    const productName = formData.get('productName') as string
    const destination = formData.get('destination') as string
    const quantity = parseInt(formData.get('quantity') as string) || 1
    const memo = (formData.get('memo') as string) || null
    const status = (formData.get('status') as string) || '예정'

    await prisma.delivery.create({
        data: {
            date: new Date(dateStr),
            productName,
            destination,
            quantity,
            memo,
            performedBy,
            status,
        }
    })

    revalidatePath('/delivery')
}

export async function updateDelivery(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const id = parseInt(formData.get('id') as string)
    const dateStr = formData.get('date') as string
    const productName = formData.get('productName') as string
    const destination = formData.get('destination') as string
    const quantity = parseInt(formData.get('quantity') as string) || 1
    const memo = (formData.get('memo') as string) || null
    const performedBy = (formData.get('performedBy') as string) || ''
    const status = (formData.get('status') as string) || '예정'

    await prisma.delivery.update({
        where: { id },
        data: {
            date: new Date(dateStr),
            productName,
            destination,
            quantity,
            memo,
            performedBy,
            status,
        }
    })

    revalidatePath('/delivery')
}

export async function deleteDelivery(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const id = parseInt(formData.get('id') as string)
    await prisma.delivery.delete({ where: { id } })
    revalidatePath('/delivery')
}

// ─── Work Checklist Actions ──────────────────────────────────────────────────

export async function createWorkChecklist(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const companyName = formData.get('companyName') as string
    const hasDelivery = formData.get('hasDelivery') === 'true'
    const hasCrmUpdate = formData.get('hasCrmUpdate') === 'true'
    const crmType = (formData.get('crmType') as string) || 'AS'

    const checklist = await (prisma as any).workChecklist.create({
        data: {
            companyName,
            hasDelivery,
            hasCrmUpdate,
            crmType,
            createdBy: session?.user?.name || '',
        }
    })

    revalidatePath('/checklist')
    return { id: checklist.id }
}

export async function updateWorkChecklist(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const id = parseInt(formData.get('id') as string)

    const data: Record<string, unknown> = {}

    // 택배 필드
    if (formData.has('deliveryCarrier')) data.deliveryCarrier = formData.get('deliveryCarrier') as string
    if (formData.has('deliveryItems')) data.deliveryItems = formData.get('deliveryItems') as string
    if (formData.has('deliverySent')) data.deliverySent = formData.get('deliverySent') === 'true'

    // CRM 체크 항목
    if (formData.has('crmUpdated')) data.crmUpdated = formData.get('crmUpdated') === 'true'
    if (formData.has('poolInfoUpdated')) data.poolInfoUpdated = formData.get('poolInfoUpdated') === 'true'
    if (formData.has('quoteSent')) data.quoteSent = formData.get('quoteSent') === 'true'
    if (formData.has('photosAttached')) data.photosAttached = formData.get('photosAttached') === 'true'
    if (formData.has('paymentUpdated')) data.paymentUpdated = formData.get('paymentUpdated') === 'true'
    if (formData.has('naverWorksLogged')) data.naverWorksLogged = formData.get('naverWorksLogged') === 'true'
    if (formData.has('completed')) data.completed = formData.get('completed') === 'true'
    if (formData.has('usedParts')) data.usedParts = formData.get('usedParts') as string

    await (prisma as any).workChecklist.update({ where: { id }, data })
    revalidatePath('/checklist')
}

export async function addChecklistPart(checklistId: number, partId: number, qty: number, transactionType: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const performedBy = session.user.name

    const checklist = await prisma.workChecklist.findUnique({ where: { id: checklistId } })
    if (!checklist) throw new Error('업무체크 항목을 찾을 수 없습니다.')

    const part = await prisma.part.findUnique({ where: { id: partId } })
    if (!part) throw new Error('부품을 찾을 수 없습니다.')

    if (part.stock < qty) throw new Error(`재고 부족: ${part.name} (현재 ${part.stock}개)`)

    const usedPartsArray = checklist.usedParts ? JSON.parse(checklist.usedParts) : []
    
    // Check if part is already added to this checklist
    const existingIndex = usedPartsArray.findIndex((p: any) => p.partId === partId)
    if (existingIndex > -1) {
        usedPartsArray[existingIndex].qty += qty
    } else {
        usedPartsArray.push({ partId, partName: part.name, qty })
    }

    const note = `[업무체크] ${checklist.companyName}`

    await prisma.$transaction([
        prisma.part.update({
            where: { id: partId },
            data: { stock: { decrement: qty } }
        }),
        prisma.stockTransaction.create({
            data: { partId, delta: -qty, transactionType, note, performedBy }
        }),
        (prisma as any).workChecklist.update({
            where: { id: checklistId },
            data: { usedParts: JSON.stringify(usedPartsArray) }
        })
    ])

    revalidatePath('/checklist')
    revalidatePath('/parts')
}

export async function batchAddChecklistPart(checklistId: number, parts: { partId: number, qty: number }[], transactionType: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return { success: false, error: '로그인이 필요합니다.' }

    const performedBy = session.user.name

    try {
        const checklist = await prisma.workChecklist.findUnique({ where: { id: checklistId } })
        if (!checklist) return { success: false, error: '업무체크 항목을 찾을 수 없습니다.' }

        if (!parts.length) return { success: true }

        // Fetch and validate stock
        const partIds = parts.map(p => p.partId)
        const dbParts = await prisma.part.findMany({ where: { id: { in: partIds } } })
        const stockMap = new Map<number, Part>(dbParts.map((p: Part) => [p.id, p]))

        for (const p of parts) {
            const part = stockMap.get(p.partId)
            if (!part) return { success: false, error: '부품을 찾을 수 없습니다.' }
            if (part.stock < p.qty) return { success: false, error: `재고 부족: ${part.name} (현재 ${part.stock}개)` }
        }

        const usedPartsArray = checklist.usedParts ? JSON.parse(checklist.usedParts) : []
        
        // Add all parts to usedPartsArray
        for (const p of parts) {
            const part = stockMap.get(p.partId)!
            const existingIndex = usedPartsArray.findIndex((up: any) => up.partId === p.partId)
            if (existingIndex > -1) {
                usedPartsArray[existingIndex].qty += p.qty
            } else {
                usedPartsArray.push({ partId: p.partId, partName: part.name, qty: p.qty })
            }
        }

        const note = `[업무체크 다중추가] ${checklist.companyName}`

        await prisma.$transaction([
            ...parts.map(p => prisma.part.update({
                where: { id: p.partId },
                data: { stock: { decrement: p.qty } }
            })),
            ...parts.map(p => prisma.stockTransaction.create({
                data: { partId: p.partId, delta: -p.qty, transactionType, note, performedBy }
            })),
            (prisma as any).workChecklist.update({
                where: { id: checklistId },
                data: { usedParts: JSON.stringify(usedPartsArray) }
            })
        ])

        revalidatePath('/checklist')
        revalidatePath('/parts')
        
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || '알 수 없는 서버 오류가 발생했습니다.' }
    }
}

export async function removeChecklistPart(checklistId: number, partId: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return { success: false, error: '로그인이 필요합니다.' }

    const performedBy = session.user.name

    try {
        const checklist = await prisma.workChecklist.findUnique({ where: { id: checklistId } })
        if (!checklist || !checklist.usedParts) return { success: true }

        const usedPartsArray = JSON.parse(checklist.usedParts)
        const existingIndex = usedPartsArray.findIndex((p: any) => p.partId === partId)
        if (existingIndex === -1) return { success: true }

        const qtyToRefund = usedPartsArray[existingIndex].qty
        const partName = usedPartsArray[existingIndex].partName
        usedPartsArray.splice(existingIndex, 1)

        const note = `[업무체크 삭제환불] ${checklist.companyName}`

        await prisma.$transaction([
            prisma.part.update({
                where: { id: partId },
                data: { stock: { increment: qtyToRefund } }
            }),
            prisma.stockTransaction.create({
                data: { partId, delta: qtyToRefund, transactionType: "재고복구", note, performedBy }
            }),
            (prisma as any).workChecklist.update({
                where: { id: checklistId },
                data: { usedParts: usedPartsArray.length > 0 ? JSON.stringify(usedPartsArray) : null }
            })
        ])

        revalidatePath('/checklist')
        revalidatePath('/parts')
        
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || '알 수 없는 서버 오류가 발생했습니다.' }
    }
}

export async function deleteWorkChecklist(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const performedBy = session.user.name
    const id = parseInt(formData.get('id') as string)
    
    // Auto-refund parts if any exist before deleting
    const checklist = await prisma.workChecklist.findUnique({ where: { id } })
    if (checklist && checklist.usedParts) {
        const usedPartsArray = JSON.parse(checklist.usedParts)
        const note = `[업무체크 일괄삭제환불] ${checklist.companyName}`
        
        const txs: any[] = []
        for (const p of usedPartsArray) {
            txs.push(prisma.part.update({
                where: { id: p.partId },
                data: { stock: { increment: p.qty } }
            }))
            txs.push(prisma.stockTransaction.create({
                data: { partId: p.partId, delta: p.qty, transactionType: "재고복구", note, performedBy }
            }))
        }
        await prisma.$transaction(txs)
    }

    await prisma.workChecklist.delete({ where: { id } })
    revalidatePath('/checklist')
    revalidatePath('/parts')
}

export async function moveToTodayWorkChecklist(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) throw new Error('로그인이 필요합니다.')

    const id = parseInt(formData.get('id') as string)
    await (prisma as any).workChecklist.update({
        where: { id },
        data: { createdAt: new Date() }
    })
    revalidatePath('/checklist')
}

export async function getWorkChecklists() {
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

    return (prisma as any).workChecklist.findMany({
        where: { 
            createdAt: { gte: today, lt: tomorrow },
            createdBy: userName
        },
        orderBy: { createdAt: 'desc' }
    })
}

