import * as React from "react"
import { ChevronLeft } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils.js"
import { buttonVariants } from "@/components/ui/button.jsx"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
} ={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm ={{
        Chevron: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
