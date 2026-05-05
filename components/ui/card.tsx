import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
    return (
        <div className={cn("rounded-2xl border border-border/50 bg-card p-6 shadow-sm", className)} {...props}>
            {children}
        </div>
    )
}