import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-bordeaux-500 to-bordeaux-600 text-white shadow-sm shadow-bordeaux-500/20",
        secondary:
          "border-transparent bg-gray-500/20 text-gray-300 border-gray-500/30",
        destructive:
          "border-transparent bg-gradient-to-r from-bordeaux-500 to-bordeaux-600 text-white shadow-sm shadow-bordeaux-500/20",
        outline: "border border-white/30 border-bordeaux-500/50 bg-white/15 text-gray-200 hover:bg-white/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
