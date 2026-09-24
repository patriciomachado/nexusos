import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const PremiumTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full bg-foreground/[0.04] border border-transparent rounded-xl py-2.5 px-3.5 md:text-[15px] text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/15 transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-none hover:bg-foreground/[0.06]",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
PremiumTextarea.displayName = "PremiumTextarea"

export { PremiumTextarea }
