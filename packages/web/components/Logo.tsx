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
        className="w-full h-full shrink-0 scale-125"
      >
        <rect width="32" height="32" rx="6" fill="url(#tw-logo-gradient)" />
        {/* Weaving motif: two diagonal bands crossing */}
        {/* Band 2 (under): top-right to bottom-left — split into two segments so band 1 appears on top */}
        <rect
          x="13"
          y="6"
          width="6"
          height="9"
          rx="3"
          fill="white"
          opacity="0.9"
          transform="rotate(-45 16 16)"
        />
        <rect
          x="13"
          y="17"
          width="6"
          height="9"
          rx="3"
          fill="white"
          opacity="0.9"
          transform="rotate(-45 16 16)"
        />
        {/* Band 1 (over): top-left to bottom-right — single unbroken band */}
        <rect
          x="13"
          y="6"
          width="6"
          height="20"
          rx="3"
          fill="white"
          transform="rotate(45 16 16)"
        />
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
