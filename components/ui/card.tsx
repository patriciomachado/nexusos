import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
    return (
        <div className={cn("rounded-2xl border border-border/60 bg-card p-5 sm:p-6", className)} {...props}>
            {children}
        </div>
    )
}