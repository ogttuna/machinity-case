// components/logo.tsx
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
    alt?: string;
    className?: string;
    lightSrc?: string;
    darkSrc?: string;
    width?: number;
    height?: number;
    priority?: boolean;
};

export function Logo({
                         alt = "Machinity",
                         className,
                         lightSrc = "/images/logo-light.png",
                         darkSrc = "/images/logo-dark.png",
                         width = 120,
                         height = 32,
                         priority = false,
                     }: LogoProps) {
    return (
        <span className={cn("relative inline-flex items-center", className)} aria-label={alt}>
      {/* Light mode */}
            <Image
                src={lightSrc}
                alt={alt}
                width={width}
                height={height}
                priority={priority}
                className="block dark:hidden"
            />
            {/* Dark mode */}
            <Image
                src={darkSrc}
                alt={alt}
                width={width}
                height={height}
                priority={priority}
                className="hidden dark:block"
            />
    </span>
    );
}
