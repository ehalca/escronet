"use client";

import React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 select-none",
  variants: {
    variant: {
      solid: "",
      outline: "border bg-transparent",
      link: "underline-offset-4 hover:underline bg-transparent",
    },
    action: {
      primary:   "bg-primary-500   text-white     hover:bg-primary-600   focus-visible:ring-primary-500",
      secondary: "bg-secondary-500 text-white     hover:bg-secondary-600 focus-visible:ring-secondary-500",
      positive:  "bg-success-500   text-white     hover:bg-success-700   focus-visible:ring-success-500",
      negative:  "bg-error-500     text-white     hover:bg-error-700     focus-visible:ring-error-500",
      default:   "bg-zinc-900      text-white     hover:bg-zinc-700      focus-visible:ring-zinc-900   dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
    },
    size: {
      xs: "h-8  px-3   text-xs",
      sm: "h-9  px-4   text-sm",
      md: "h-10 px-5   text-sm",
      lg: "h-11 px-6   text-base",
      xl: "h-12 px-7   text-lg",
    },
  },
  compoundVariants: [
    {
      variant: "outline",
      action: "primary",
      class: "bg-transparent text-primary-500 border-primary-500 hover:bg-primary-50",
    },
    {
      variant: "outline",
      action: "negative",
      class: "bg-transparent text-error-500 border-error-500 hover:bg-red-50",
    },
    {
      variant: ["link", "outline"],
      action: ["primary", "secondary", "positive", "negative", "default"],
      class: "bg-transparent",
    },
  ],
  defaultVariants: {
    variant: "solid",
    action: "default",
    size: "md",
  },
});

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, action, size, ...props }, ref) => (
    <button
      ref={ref}
      className={button({ variant, action, size, class: className })}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export type { ButtonProps };
