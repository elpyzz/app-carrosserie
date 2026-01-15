import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-lg border border-white/30 border-bordeaux-500/40 bg-white/15 backdrop-blur-sm px-4 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:border-bordeaux-500/60 focus-visible:ring-2 focus-visible:ring-bordeaux-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
