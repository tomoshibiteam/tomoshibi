import { ReactNode, useEffect, useRef } from "react";

interface MobileFrameProps {
  header?: ReactNode;
  content: ReactNode;
  bottomNav?: ReactNode;
  enableFontScale?: boolean;
}

const MobileFrame = ({ header, content, bottomNav, enableFontScale = false }: MobileFrameProps) => {
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyBottom: body.style.bottom,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlFontSize: html.style.fontSize,
    };

    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = "0";
    body.style.left = "0";
    body.style.right = "0";
    body.style.bottom = "0";
    body.style.overscrollBehavior = "none";

    const updateFontScale = () => {
      if (!enableFontScale) return;
      const frame = frameRef.current;
      if (!frame) return;
      const { width } = frame.getBoundingClientRect();
      if (!width) return;
      const baselineWidth = 390;
      const scale = Math.min(1, Math.max(0.9, width / baselineWidth));
      html.style.fontSize = `${16 * scale}px`;
    };

    updateFontScale();
    window.addEventListener("resize", updateFontScale);

    return () => {
      window.removeEventListener("resize", updateFontScale);
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.bottom = prev.bodyBottom;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      html.style.fontSize = prev.htmlFontSize;
    };
  }, [enableFontScale]);

  return (
    <div className="fixed inset-0 bg-background md:bg-[#f2f0ec] flex items-center justify-center md:px-3 md:py-0 overflow-hidden">
      {/* Use dvh (dynamic viewport height) for mobile to account for browser chrome */}
      <div
        ref={frameRef}
        style={{ transform: "translate3d(0, 0, 0)" }}
        className="mobile-frame w-full max-w-[430px] h-[100dvh] max-h-[100dvh] bg-background md:w-auto md:max-w-none md:h-[95dvh] md:aspect-[1170/2532] md:rounded-[40px] md:shadow-[0_24px_48px_rgba(61,43,31,0.14)] md:border-[8px] md:border-[#1a1a1a] overflow-hidden"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header with safe area padding */}
          {header && (
            <div
              className="shrink-0"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              {header}
            </div>
          )}

          {/* Content area - scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-background">
            {content}
          </div>

          {/* Bottom nav with safe area padding */}
          {bottomNav && (
            <div
              className="shrink-0 bg-[#f7efe5] border-t border-[#e9dccb]"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              {bottomNav}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileFrame;
