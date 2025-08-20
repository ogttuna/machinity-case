import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type FavoritesFilter = "all" | "only" | "non";

export function FavoritesFilter({
                                    value,
                                    onChange,
                                }: {
    value: FavoritesFilter;
    onChange: (val: FavoritesFilter) => void;
}) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">Favoriler</p>
            <RadioGroup value={value} onValueChange={(val) => onChange(val as FavoritesFilter)}>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="fav-all" />
                    <Label htmlFor="fav-all">Hepsi</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="only" id="fav-only" />
                    <Label htmlFor="fav-only">Sadece Favoriler</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non" id="fav-non" />
                    <Label htmlFor="fav-non">Favori Olmayanlar</Label>
                </div>
            </RadioGroup>
        </div>
    );
}
