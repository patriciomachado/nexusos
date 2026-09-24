import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[15px] font-semibold transition-[background-color,opacity,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:opacity-90",
                destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
                outline: "border border-border bg-transparent hover:bg-foreground/[0.04]",
                secondary: "bg-primary/12 text-primary hover:bg-primary/18",
                ghost: "text-primary hover:bg-foreground/[0.05]",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-11 px-4",
                sm: "h-8 px-3 text-[13px] rounded-lg",
                lg: "h-12 px-6 text-[17px]",
                icon: "h-11 w-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"