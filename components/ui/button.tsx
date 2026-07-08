import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[#FF3000] uppercase font-bold tracking-wide",
        destructive:
          "bg-destructive text-white hover:bg-black focus-visible:ring-destructive/20 uppercase font-bold tracking-wide",
        outline:
          "border-2 border-black bg-background hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000] uppercase font-bold tracking-wide",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-black hover:text-white uppercase font-bold tracking-wide",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        blue: "bg-blue-400 text-white hover:bg-blue-500",
        red: "bg-red-400 text-white hover:bg-red-500",
        green: "bg-green-500 text-white hover:bg-green-600",
        yellow: "bg-yellow-400 text-dark hover:bg-yellow-500",
        purple: "bg-purple-500 text-white hover:bg-purple-600",
        pink: "bg-pink-500 text-white hover:bg-pink-600",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
