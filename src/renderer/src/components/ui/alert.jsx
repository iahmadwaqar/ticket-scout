import * as React from "react"
import { cva} from "class-variance-authority"

import { cn } from "@/lib/utils.js"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*] = React.forwardRef & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p] = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
