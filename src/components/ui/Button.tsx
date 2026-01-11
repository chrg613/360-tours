import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary-600)] text-white shadow hover:bg-[var(--color-primary-700)] focus-visible:ring-[var(--color-primary-500)]',
        destructive:
          'bg-[var(--color-error-600)] text-white shadow-sm hover:bg-[var(--color-error-500)] focus-visible:ring-[var(--color-error-500)]',
        outline:
          'border border-[var(--color-border)] bg-transparent shadow-sm hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary-500)]',
        secondary:
          'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-border)] focus-visible:ring-[var(--color-primary-500)]',
        ghost:
          'hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary-500)]',
        link: 'text-[var(--color-primary-600)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-primary-500)]',
        success:
          'bg-[var(--color-success-600)] text-white shadow-sm hover:bg-[var(--color-success-500)] focus-visible:ring-[var(--color-success-500)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
