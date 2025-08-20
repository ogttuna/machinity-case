"use client";

import * as React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/state/useFilters";

export function SortDropdown() {
    const { sortBy, setSortBy } = useFilters();

    return (
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="alphabetical">Alfabetik (A–Z)</SelectItem>
                <SelectItem value="price-asc">Fiyat (Artan)</SelectItem>
                <SelectItem value="price-desc">Fiyat (Azalan)</SelectItem>
                <SelectItem value="rating-desc">Puan (Yüksek → Düşük)</SelectItem>
                <SelectItem value="rating-asc">Puan (Düşük → Yüksek)</SelectItem>
            </SelectContent>
        </Select>
    );
}
