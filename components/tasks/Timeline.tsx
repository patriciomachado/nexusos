'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PRIORITY_META, MODULE_META, type Task, type TaskAlert } from '@/lib/tasks/types'

const HOUR_PX = 56

function minutesOf(time: string) {
    return +time.slice(0, 2) * 60 + +time.slice(3, 5)
}

interface TimelineProps {
    tasks: Task[]
    alerts: TaskAlert[]
    onOpen: (task: Task) => void
}

/** Hour-by-hour view of the day (Structured). Only items with a time appear. */
export default function Timeline({ tasks, alerts, onOpen }: TimelineProps) {
    const [now, setNow] = useState<number | null>(null)

    useEffect(() => {
        const tick = () => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()) }
        tick()
        const id = setInterval(tick, 60_000)
        return () => clearInterval(id)
    }, [])

    const timed = tasks.filter(t => t.do_time)
    const timedAlerts = alerts.filter(a => a.time)
    const times = [...timed.map(t => minutesOf(t.do_time!)), ...timedAlerts.map(a => minutesOf(a.time!))]
    const start = Math.min(8, ...times.map(m => Math.floor(m / 60)))
    const end = Math.max(19, ...times.map(m => Math.ceil(m / 60) + 1))
    const hours = Array.from({ length: end - start }, (_, i) => start + i)

    type Item = { key: string; top: number; height: number; label: string; sub: string; color: string; task?: Task; href?: string }
    const items: Item[] = [
        ...timed.map(t => {
            const m = minutesOf(t.do_time!)
            const dur = t.duration_minutes ?? 30
            return {
                key: t.id,
                top: ((m - start * 60) / 60) * HOUR_PX,
                height: Math.max(36, (dur / 60) * HOUR_PX - 2),
                label: t.title,
                sub: `${t.do_time!.slice(0, 5)}${t.duration_minutes ? ` · ${t.duration_minutes} min` : ''}`,
                color: PRIORITY_META[t.priority].color,
                task: t,
            }
        }),
        ...timedAlerts.map(a => ({
            key: a.key,
            top: ((minutesOf(a.time!) - start * 60) / 60) * HOUR_PX,
            height: 36,
            label: a.title,
            sub: `${a.time} · ${MODULE_META[a.module].label}`,
            color: MODULE_META[a.module].tint,
            href: a.href,
        })),
    ].sort((a, b) => a.top - b.top)

    // Side-by-side columns for overlapping items.
    const lanes: number[] = []
    const placed = items.map(item => {
        let lane = lanes.findIndex(bottom => bottom <= item.top)
        if (lane === -1) { lane = lanes.length; lanes.push(0) }
        lanes[lane] = item.top + item.height
        return { ...item, lane }
    })
    const laneCount = Math.max(1, lanes.length)

    return (
        <div className="relative select-none" style={{ height: hours.length * HOUR_PX }} aria-label="Linha do tempo de hoje">
            {hours.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: i * HOUR_PX }}>
                    <span className="w-11 -mt-2 text-[11px] text-muted-foreground tabular-nums text-right pr-2">{String(h).padStart(2, '0')}:00</span>
                    <div className="flex-1 h-px bg-border/70" />
                </div>
            ))}

            {now !== null && now >= start * 60 && now <= end * 60 && (
                <div className="absolute left-9 right-0 flex items-center z-10 pointer-events-none" style={{ top: ((now - start * 60) / 60) * HOUR_PX }}>
                    <span className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-[1.5px] bg-red-500" />
                </div>
            )}

            <div className="absolute left-12 right-1 top-0 bottom-0">
                {placed.map(item => {
                    const style = {
                        top: item.top + 1,
                        height: item.height,
                        left: `${(item.lane / laneCount) * 100}%`,
                        width: `calc(${100 / laneCount}% - 4px)`,
                    }
                    const body = (
                        <>
                            <span className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', item.color)} />
                            <span className="block text-[13px] font-medium text-foreground truncate leading-tight">{item.label}</span>
                            <span className="block text-[11px] text-muted-foreground truncate tabular-nums">{item.sub}</span>
                        </>
                    )
                    const cls = 'absolute rounded-lg bg-card border border-border/70 shadow-sm pl-3 pr-2 py-1 overflow-hidden text-left hover:border-primary/50 transition-colors'
                    return item.task ? (
                        <button key={item.key} type="button" onClick={() => onOpen(item.task!)} className={cls} style={style}>{body}</button>
                    ) : (
                        <Link key={item.key} href={item.href!} className={cls} style={style}>{body}</Link>
                    )
                })}
            </div>
        </div>
    )
}
