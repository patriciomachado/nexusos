import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode
    label?: string
}

const PremiumInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon, label, ...props }, ref) => {
        return (
            <div className="relative group w-full">
                {label && (
                    <label className="block text-[13px] font-medium text-muted-foreground mb-2 px-1">
                        {label}
                    </label>
                )}
                <div className="relative group/input">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-11 w-full bg-foreground/[0.04] border border-transparent rounded-xl py-2.5 px-3.5 md:text-[15px] text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/15 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                            icon && "pl-11",
                            "hover:bg-foreground/[0.06]",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
            </div>
        )
    }
)
PremiumInput.displayName = "PremiumInput"

export { PremiumInput }
