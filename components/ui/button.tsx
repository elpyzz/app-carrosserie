import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-bordeaux-800 via-bordeaux-700 to-bordeaux-800 text-white hover:from-bordeaux-900 hover:via-bordeaux-800 hover:to-bordeaux-900 shadow-lg shadow-bordeaux-500/30 hover:shadow-xl hover:shadow-bordeaux-500/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-bordeaux-500/20",
        destructive:
          "bg-gradient-to-r from-bordeaux-800 to-bordeaux-900 text-white hover:from-bordeaux-900 hover:to-bordeaux-950 shadow-lg shadow-bordeaux-900/40 hover:shadow-xl hover:shadow-bordeaux-900/50 transition-all duration-300",
        outline:
          "border-2 border-bordeaux-500/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-bordeaux-400/50 text-bordeaux-300 hover:text-bordeaux-200 hover:shadow-md transition-all duration-300",
        secondary:
          "bg-bordeaux-500/20 text-bordeaux-300 hover:bg-bordeaux-500/30 border border-bordeaux-500/30 backdrop-blur-sm transition-all duration-300",
        ghost: "hover:bg-white/10 hover:text-bordeaux-300 text-gray-300 transition-all duration-300",
        link: "text-bordeaux-400 underline-offset-4 hover:underline hover:text-bordeaux-300 transition-colors",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
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

export { Button, buttonVariants }
