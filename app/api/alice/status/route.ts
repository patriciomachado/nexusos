import { NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { aliceConfigured, canUseAlice, isAdminRole, loadSettings } from '@/lib/alice/config'
import { transcriptionConfigured } from '@/lib/alice/transcribe'

/** What the app needs to show (or hide) the Alice button and microphone. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const isAdmin = isAdminRole(ctx.role)
    const { error } = await ctx.db.from('alice_settings').select('company_id').limit(1)
    if (error) {
        return NextResponse.json({ available: isAdmin, isAdmin, setupNeeded: 'migration', configured: aliceConfigured(), transcription: transcriptionConfigured() })
    }
    const settings = await loadSettings(ctx.db, ctx.companyId)
    return NextResponse.json({
        available: canUseAlice(ctx.role, settings),
        isAdmin,
        setupNeeded: aliceConfigured() ? null : 'api_key',
        configured: aliceConfigured(),
        transcription: transcriptionConfigured(),
    })
}
