import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const PremiumTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full bg-muted/40 border border-border rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all backdrop-blur-2xl disabled:cursor-not-allowed disabled:opacity-50 resize-none hover:bg-muted/60 hover:border-border/80",
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
