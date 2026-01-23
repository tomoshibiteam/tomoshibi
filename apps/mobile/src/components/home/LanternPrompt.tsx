import { useCallback } from "react";
import type { KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface LanternPromptProps {
    value: string;
    onChange: (value: string) => void;
    onIgnite: () => void;
    disabled?: boolean;
    prefixes?: string[];
}

const LanternPrompt = ({ value, onChange, onIgnite, disabled, prefixes = [] }: LanternPromptProps) => {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!disabled) onIgnite();
            }
        },
        [disabled, onIgnite]
    );

    return (
        <div className="rounded-2xl border border-border/70 bg-white px-3 py-2 shadow-sm">
            {prefixes.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                    {prefixes.map((prefix) => (
                        <span
                            key={prefix}
                            className="rounded-full border border-border/60 bg-stone-50 px-2.5 py-1 text-xs text-muted-foreground"
                        >
                            {prefix}
                        </span>
                    ))}
                </div>
            )}
            <div className="flex items-end gap-2">
                <Textarea
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="どのような旅を設計しますか？"
                    className="min-h-[56px] max-h-40 resize-none border-0 bg-transparent px-0 py-2.5 text-lg leading-relaxed focus-visible:ring-0 placeholder:text-muted-foreground/50"
                />
                <Button
                    type="button"
                    onClick={onIgnite}
                    disabled={disabled}
                    className="h-10 w-10 shrink-0 rounded-full p-0 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
                >
                    <Sparkles className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

export default LanternPrompt;
