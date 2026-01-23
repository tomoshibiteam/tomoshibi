import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-autoplay";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Quest {
    id: string;
    title: string;
    cover_image_url: string | null;
    location?: string;
}

const QuestShowcase = () => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Autoplay plugin settings for smooth continuous scrolling feel
    const [emblaRef] = useEmblaCarousel({ loop: true, dragFree: true }, [
        AutoScroll({ delay: 3000, stopOnInteraction: false, rootNode: (emblaRoot) => emblaRoot.parentElement }),
    ]);

    useEffect(() => {
        const fetchQuests = async () => {
            try {
                const { data, error } = await supabase
                    .from("quests")
                    .select("id, title, cover_image_url")
                    .not("cover_image_url", "is", null)
                    .order("created_at", { ascending: false })
                    .limit(10);

                if (error) {
                    console.warn("Could not fetch quests, using demo data:", error);
                    // Use demo data as fallback
                    setQuests([
                        {
                            id: "demo-1",
                            title: "古都の裏路地と猫の集会場",
                            cover_image_url: "https://images.unsplash.com/photo-1578469607883-fa428619f201?q=80&w=2670&auto=format&fit=crop",
                        },
                        {
                            id: "demo-2",
                            title: "雨上がりのネオン・サイバーパンク",
                            cover_image_url: "https://images.unsplash.com/photo-1542931287-023b922fa89b?q=80&w=2672&auto=format&fit=crop",
                        },
                        {
                            id: "demo-3",
                            title: "海風が運ぶ古い手紙の謎",
                            cover_image_url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2670&auto=format&fit=crop",
                        },
                        {
                            id: "demo-4",
                            title: "静寂の森と消えた天文台",
                            cover_image_url: "https://images.unsplash.com/photo-1448375240586-dfd8f3793300?q=80&w=2670&auto=format&fit=crop",
                        },
                        {
                            id: "demo-5",
                            title: "下町の夕暮れとコロッケ",
                            cover_image_url: "https://images.unsplash.com/photo-1549421272-358b548d8d38?q=80&w=2674&auto=format&fit=crop",
                        },
                    ]);
                } else if (data && data.length > 0) {
                    setQuests(data);
                } else {
                    // No data, use demo
                    setQuests([
                        {
                            id: "demo-1",
                            title: "古都の裏路地と猫の集会場",
                            cover_image_url: "https://images.unsplash.com/photo-1578469607883-fa428619f201?q=80&w=2670&auto=format&fit=crop",
                        },
                        {
                            id: "demo-2",
                            title: "雨上がりのネオン・サイバーパンク",
                            cover_image_url: "https://images.unsplash.com/photo-1542931287-023b922fa89b?q=80&w=2672&auto=format&fit=crop",
                        },
                        {
                            id: "demo-3",
                            title: "海風が運ぶ古い手紙の謎",
                            cover_image_url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2670&auto=format&fit=crop",
                        },
                    ]);
                }
            } catch (error) {
                console.error("Error fetching quests:", error);
                // Use demo data as fallback
                setQuests([
                    {
                        id: "demo-1",
                        title: "古都の裏路地と猫の集会場",
                        cover_image_url: "https://images.unsplash.com/photo-1578469607883-fa428619f201?q=80&w=2670&auto=format&fit=crop",
                    },
                    {
                        id: "demo-2",
                        title: "雨上がりのネオン・サイバーパンク",
                        cover_image_url: "https://images.unsplash.com/photo-1542931287-023b922fa89b?q=80&w=2672&auto=format&fit=crop",
                    },
                    {
                        id: "demo-3",
                        title: "海風が運ぶ古い手紙の謎",
                        cover_image_url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2670&auto=format&fit=crop",
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchQuests();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full space-y-3 fade-in-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-xs font-bold text-stone-500 tracking-wider">EXPLORE</h2>
                    <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                        読み込み中...
                    </span>
                </div>
                <div className="flex gap-6 pl-4 pr-16 py-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="relative flex-[0_0_85%] sm:flex-[0_0_45%] aspect-[16/9] rounded-2xl bg-stone-200 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-3 fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between px-4">
                <h2 className="text-xs font-bold text-stone-500 tracking-wider">EXPLORE</h2>
                <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    新着の冒険
                </span>
            </div>

            <div className="overflow-visible" ref={emblaRef}>
                <div className="flex touch-pan-y gap-6 pl-4 pr-16 py-2">
                    {quests.map((quest) => (
                        <div
                            key={quest.id}
                            className="relative flex-[0_0_85%] sm:flex-[0_0_45%] aspect-[16/9] rounded-2xl overflow-hidden shadow-md border border-white/20 group select-none"
                        >
                            <img
                                src={quest.cover_image_url || ""}
                                alt={quest.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                <h3 className="text-xs font-bold leading-tight line-clamp-2">
                                    {quest.title}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuestShowcase;
