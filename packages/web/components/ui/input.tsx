import * as React from "react"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, loading, ...props }, ref) => {

    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-[calc(50%-8px)] h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
