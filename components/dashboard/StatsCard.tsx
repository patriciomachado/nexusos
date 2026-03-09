'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: string
        isUp: boolean
    }
    color?: 'blue' | 'emerald' | 'purple' | 'orange' | 'rose'
    className?: string
}

const COLOR_MAP = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-orange-500/10',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
}

export default function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    color = 'blue',
    className
}: StatsCardProps) {
    return (
        <div className={cn(
            "group relative bg-card/40 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden",
            className
        )}>
            {/* Background Glow */}
            <div className={cn(
                "absolute -top-20 -right-20 w-40 h-40 blur-[80px] rounded-full transition-colors opacity-20 group-hover:opacity-40",
                color === 'blue' ? 'bg-blue-500' :
                    color === 'emerald' ? 'bg-emerald-500' :
                        color === 'purple' ? 'bg-purple-500' :
                            color === 'orange' ? 'bg-orange-500' : 'bg-rose-500'
            )} />

            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 shadow-inner",
                        COLOR_MAP[color]
                    )}>
                        <Icon className="w-7 h-7" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            trend.isUp ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        )}>
                            {trend.isUp ? '↑' : '↓'} {trend.value}
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter">{value}</h3>
                    {description && (
                        <p className="text-[10px] text-muted-foreground/60 font-bold mt-2 uppercase tracking-wide italic">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
