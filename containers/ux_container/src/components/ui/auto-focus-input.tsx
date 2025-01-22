import React, { forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface AutoFocusInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const AutoFocusInput = forwardRef<HTMLInputElement, AutoFocusInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        className={cn("focus:outline-none focus:ring-0", className)}
      />
    );
  }
);

AutoFocusInput.displayName = "AutoFocusInput";

export { AutoFocusInput };
