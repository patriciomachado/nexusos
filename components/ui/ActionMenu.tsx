'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActionMenuItem =
    | { label: string; icon?: React.ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean }
    | 'separator'

/**
 * "…" button with a context menu (menus.md): keyboard, Esc and outside tap
 * handled by Radix, destructive items in red.
 */
export default function ActionMenu({ items, label = 'Mais ações', className }: { items: ActionMenuItem[]; label?: string; className?: string }) {
    return (
        <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className={cn('w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground data-[state=open]:bg-foreground/[0.08] transition-colors', className)}
                >
                    <MoreHorizontal aria-hidden className="w-5 h-5" />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    collisionPadding={8}
                    className="z-[900] min-w-[220px] rounded-xl material-thick border border-border/70 shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-150"
                >
                    {items.map((item, i) => item === 'separator' ? (
                        <DropdownMenu.Separator key={`sep-${i}`} className="h-px my-1 bg-border/70" />
                    ) : (
                        <DropdownMenu.Item
                            key={item.label}
                            disabled={item.disabled}
                            onSelect={item.onSelect}
                            className={cn(
                                'flex items-center gap-3 px-3 min-h-11 rounded-lg text-[17px] cursor-pointer outline-none select-none data-[highlighted]:bg-foreground/[0.07] data-[disabled]:opacity-40',
                                item.danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                            )}
                        >
                            <span className="flex-1">{item.label}</span>
                            {item.icon && <span aria-hidden className="shrink-0 opacity-80">{item.icon}</span>}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}
