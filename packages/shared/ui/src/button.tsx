import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn({ inputs: ["ui-button", `ui-button--${variant}`, `ui-button--${size}`, className] })}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
