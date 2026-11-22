import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[filter,transform,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'eh-btn-solid',
        destructive: 'eh-btn-solid eh-btn-destructive',
        outline:
          'border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:bg-input/30 dark:border-input dark:text-slate-200 dark:hover:bg-input/50',
        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200/80',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800',
        link: 'text-slate-700 underline-offset-4 hover:text-[color:var(--brand-primary)] hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2 has-[>svg]:px-4',
        sm: "eh-btn-compact h-8 gap-1 px-3.5 text-xs leading-none font-medium tracking-normal has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-12 px-7 text-base has-[>svg]:px-6',
        icon: 'size-9',
        'icon-sm': "eh-btn-compact size-8 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
