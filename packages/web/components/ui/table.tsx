import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

type StickyOptions = {
  sticky?: boolean
  stickySide?: "left" | "right"
  stickyOffset?: number
}

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & StickyOptions
>(({ className, sticky, stickySide = "left", stickyOffset = 0, ...props }, ref) => {
  const stickyClass = sticky
    ? `sticky ${stickySide}-${stickyOffset} z-10 bg-[#f1f2f4] before:content-[''] before:shadow-md before:shadow-gray-200 before:absolute before:inset-0 before:pointer-events-none before:touch-none`
    : ""

  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left border-r border-gray-200 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        stickyClass,
        className
      )}
      {...props}
    />
  )
})
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & StickyOptions
>(({ className, sticky, stickySide = "left", stickyOffset = 0, ...props }, ref) => {
  const stickyClass = sticky
    ? `sticky ${stickySide}-${stickyOffset} bg-white z-10 before:content-[''] before:shadow-md before:shadow-gray-200 before:absolute before:inset-0 before:pointer-events-none before:touch-none`
    : " "

  return (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle border-r min-w-[120px] border-gray-200 [&:has([role=checkbox])]:pr-0",
        stickyClass,
        className
      )}
      {...props}
    />
  )
})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}