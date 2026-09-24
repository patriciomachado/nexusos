'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi, emitTasksChanged, ApiError } from './api'
import { ParsedChips, parsedToInput } from './QuickAdd'
import { useTaskStore } from '@/store/taskStore'
import { parseQuickAdd } from '@/lib/tasks/parse'
import { localDateString } from '@/lib/tasks/dates'

export function openQuickAdd() {
    window.dispatchEvent(new CustomEvent('tasks:quick-add'))
}

function isTyping(target: EventTarget | null) {
    const el = target as HTMLElement | null
    return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * Command-bar style capture available on every screen (Akiflow).
 * ⌘K / Ctrl+K, or "N" when not typing.
 */
export default function QuickAddDialog() {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState('')
    const [busy, setBusy] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const refreshBadge = useTaskStore(s => s.fetchSummary)
    const parsed = useMemo(() => parseQuickAdd(value, localDateString()), [value])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setOpen(o => !o)
            } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target) && !document.querySelector('[role="dialog"]')) {
                e.preventDefault()
                setOpen(true)
            }
        }
        const onOpen = () => setOpen(true)
        window.addEventListener('keydown', onKey)
        window.addEventListener('tasks:quick-add', onOpen)
        return () => {
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('tasks:quick-add', onOpen)
        }
    }, [])

    useEffect(() => {
        if (open) {
            setValue('')
            setTimeout(() => inputRef.current?.focus(), 30)
        }
    }, [open])

    const submit = async () => {
        if (!parsed.title || busy) return
        setBusy(true)
        try {
            const task = await tasksApi.create(parsedToInput(parsed, { do_date: localDateString() }))
            emitTasksChanged()
            refreshBadge(true)
            setOpen(false)
            toast.success('Tarefa adicionada', {
                description: task.title,
                action: { label: 'Ver', onClick: () => router.push(`/tarefas?task=${task.id}`) },
            })
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Não foi possível adicionar a tarefa.')
        } finally {
            setBusy(false)
        }
    }

    if (!open) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[1100] flex items-start justify-center pt-[12vh] px-3 bg-black/30 animate-in fade-in duration-150"
            onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
            <div role="dialog" aria-modal="true" aria-label="Adicionar tarefa" className="w-full max-w-xl rounded-2xl material-thick border border-border/70 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 px-4">
                    <ListChecks className="w-5 h-5 text-primary shrink-0" />
                    <input
                        ref={inputRef}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
                            if (e.key === 'Escape') setOpen(false)
                        }}
                        placeholder="O que você precisa fazer?"
                        aria-label="Nova tarefa"
                        enterKeyHint="done"
                        className="flex-1 h-14 bg-transparent text-[17px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                </div>
                <div className="px-4 pb-3 border-t border-border/60 pt-2.5 space-y-2">
                    {value ? <ParsedChips parsed={parsed} /> : (
                        <p className="text-[13px] text-muted-foreground">
                            Escreva naturalmente: “pagar fornecedor sexta 10h !alta”, “conferir estoque toda segunda”, “ligar cliente amanhã por 15min”.
                        </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="hidden sm:inline"><kbd className="font-sans">Enter</kbd> salva · <kbd className="font-sans">Esc</kbd> fecha</span>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!parsed.title || busy}
                            className="ml-auto h-9 px-4 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-40"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
