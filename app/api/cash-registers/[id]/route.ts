import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse, forbiddenResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    if (!isOwner(ctx.role)) return forbiddenResponse()

    try {
        // Delete associated cash transactions first
        await db
            .from('cash_transactions')
            .delete()
            .eq('cash_register_id', id)
            .eq('company_id', companyId)

        // Delete the cash register
        const { error } = await db
            .from('cash_registers')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete register' }, { status: 500 })
    }
}