"use client";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const next = theme === "dark" ? "light" : "dark";

    return (
        <button
            type="button"
            onClick={() => setTheme(next)}
            aria-label="Tema değiştir"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm
                 hover:bg-accent hover:text-accent-foreground"
        >
            <span className="sr-only">Tema değiştir</span>
            <span className="dark:hidden">🌙</span>
            <span className="hidden dark:inline">☀️</span>
        </button>
    );
}
