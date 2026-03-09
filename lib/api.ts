import { createAdminClient } from './supabase'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUser() {
    const { userId } = await auth()
    if (!userId) return null

    const db = createAdminClient()
    const { data: user } = await db
        .from('users')
        .select('*, companies(*)')
        .eq('clerk_id', userId)
        .single()

    return user
}

export function errorResponse(message: string, status = 500) {
    return NextResponse.json({ error: message }, { status })
}

export function successResponse(data: unknown, status = 200) {
    return NextResponse.json(data, { status })
}
