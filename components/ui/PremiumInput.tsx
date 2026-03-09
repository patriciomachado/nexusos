import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode
}

const PremiumInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon, ...props }, ref) => {
        return (
            <div className="relative group w-full">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-12 w-full bg-muted/40 border border-border rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all backdrop-blur-2xl disabled:cursor-not-allowed disabled:opacity-50",
                        icon && "pl-11",
                        "hover:bg-muted/60 hover:border-border/80",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        )
    }
)
PremiumInput.displayName = "PremiumInput"

export { PremiumInput }
