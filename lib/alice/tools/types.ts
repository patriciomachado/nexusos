import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

export type Channel = 'app' | 'whatsapp'

export interface ToolContext {
    db: SupabaseClient
    companyId: string
    channel: Channel
    conversationId: string
    /** App user talking to Alice (channel 'app'). */
    user?: { id: string; role: string; name: string | null }
    /** WhatsApp customer (channel 'whatsapp'): tools only see this person's data. */
    customer?: { phone: string; name: string | null; customerIds: string[] }
}

/** What the confirmation card shows before a write runs. */
export interface ActionPreview {
    title: string
    lines: string[]
}

/** Returned by a write after it runs; `href` links to the created/changed record. */
export interface ActionOutcome {
    message: string
    href?: string
    data?: Record<string, unknown>
}

export class ToolError extends Error {}

interface BaseTool<S extends z.ZodType> {
    name: string
    /** Short label for the UI while it runs, e.g. "Buscando clientes". */
    label: string
    description: string
    schema: S
    /** App roles allowed to use it. Omitted = every role allowed to use Alice. */
    roles?: string[]
}

export interface ReadTool<S extends z.ZodType = z.ZodType> extends BaseTool<S> {
    kind: 'read'
    run(ctx: ToolContext, input: z.infer<S>): Promise<unknown>
}

/**
 * Writes never run when the model asks: Alice prepares them, the person
 * confirms on screen, and only then `execute` runs (with permissions checked
 * again).
 */
export interface WriteTool<S extends z.ZodType = z.ZodType> extends BaseTool<S> {
    kind: 'write'
    preview(ctx: ToolContext, input: z.infer<S>): Promise<ActionPreview>
    execute(ctx: ToolContext, input: z.infer<S>): Promise<ActionOutcome>
}

/** Customer-facing tools on WhatsApp: safe, scoped to the customer, run immediately. */
export interface CustomerTool<S extends z.ZodType = z.ZodType> extends BaseTool<S> {
    kind: 'customer'
    run(ctx: ToolContext, input: z.infer<S>): Promise<unknown>
}

export type AnyTool = ReadTool | WriteTool | CustomerTool

export function defineRead<S extends z.ZodType>(t: Omit<ReadTool<S>, 'kind'>): ReadTool {
    return { ...t, kind: 'read' } as unknown as ReadTool
}
export function defineWrite<S extends z.ZodType>(t: Omit<WriteTool<S>, 'kind'>): WriteTool {
    return { ...t, kind: 'write' } as unknown as WriteTool
}
export function defineCustomer<S extends z.ZodType>(t: Omit<CustomerTool<S>, 'kind'>): CustomerTool {
    return { ...t, kind: 'customer' } as unknown as CustomerTool
}

export function toApiTool(tool: AnyTool): Anthropic.Tool {
    const { $schema: _ignored, ...schema } = z.toJSONSchema(tool.schema, { io: 'input' }) as Record<string, unknown>
    void _ignored
    const note = tool.kind === 'write'
        ? '\n\nEsta ação só é executada depois que o usuário tocar em "Confirmar" no cartão que aparece na tela.'
        : ''
    return {
        name: tool.name,
        description: tool.description + note,
        input_schema: schema as Anthropic.Tool.InputSchema,
    }
}

export function allowedFor(tool: AnyTool, role: string) {
    return !tool.roles || tool.roles.includes(role)
}

/** Short, readable validation error for the model. */
export function formatZodError(error: z.ZodError) {
    return error.issues.map(i => `${i.path.join('.') || 'entrada'}: ${i.message}`).join('; ')
}
