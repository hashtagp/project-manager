import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect?.(selectedDate)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect?.(undefined)
  }

  const handleQuickSelect = (selectedDate: Date) => {
    // Create a new Date object to avoid reference issues
    const newDate = new Date(selectedDate.getTime())
    handleSelect(newDate)
  }

  const getQuickDateOptions = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return [
      { label: "Today", date: today },
      { label: "Tomorrow", date: tomorrow },
      { label: "Next Week", date: nextWeek },
    ]
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal relative",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
          {date && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
        }}
      >
        <div className="border-b p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {getQuickDateOptions().map((option) => (
              <Button
                key={option.label}
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickSelect(option.date)
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            className="rounded-md"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
