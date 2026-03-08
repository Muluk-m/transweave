import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  withText?: boolean;
}

export const Logo = ({ className, withText, ...props }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        className="w-full h-full shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="url(#tw-logo-gradient)" />
        {/* Layers: three stacked language cards, back to front */}
        <rect x="10" y="5" width="16" height="11" rx="3" fill="white" opacity="0.25" />
        <rect x="8" y="10" width="16" height="11" rx="3" fill="white" opacity="0.5" />
        <rect x="6" y="15" width="16" height="11" rx="3" fill="white" />
        <defs>
          <linearGradient
            id="tw-logo-gradient"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#14b8a6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      {withText && (
        <span className="font-semibold text-lg tracking-tight">Transweave</span>
      )}
    </div>
  );
};
