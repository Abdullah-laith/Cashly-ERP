import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-1 text-base text-slate-900 transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50 aria-invalid:border-rose-600 aria-invalid:ring-2 aria-invalid:ring-rose-600/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
