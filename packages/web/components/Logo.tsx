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
        <rect width="32" height="32" rx="8" fill="url(#qlj-logo-gradient)" />
        {/* Q Shape Body */}
        <path
          d="M16 7C11.5817 7 8 10.5817 8 15C8 19.4183 11.5817 23 16 23C17.8487 23 19.551 22.3729 20.9056 21.3162L23.5858 24L25 22.5858L22.3162 19.9056C23.3729 18.551 24 16.8487 24 15C24 10.5817 20.4183 7 16 7ZM16 21C12.6863 21 10 18.3137 10 15C10 11.6863 12.6863 9 16 9C19.3137 9 22 11.6863 22 15C22 18.3137 19.3137 21 16 21Z"
          fill="white"
        />
        {/* Globe Grid Lines - Subtle */}
        <path
          d="M16 9C16 9 19 12 19 15C19 18 16 21 16 21"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <path
          d="M16 9C16 9 13 12 13 15C13 18 16 21 16 21"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <path
          d="M10 15H22"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <defs>
          <linearGradient
            id="qlj-logo-gradient"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>
      {withText && (
        <span className="font-semibold text-lg tracking-tight">Qlj i18n</span>
      )}
    </div>
  );
};
