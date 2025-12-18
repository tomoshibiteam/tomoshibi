import { ReactNode, useEffect } from "react";

interface MobileFrameProps {
  header?: ReactNode;
  content: ReactNode;
  bottomNav?: ReactNode;
}

const MobileFrame = ({ header, content, bottomNav }: MobileFrameProps) => {
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

    return () => {
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
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white md:bg-[#f2f0ec] flex items-center justify-center md:px-3 md:py-6 overflow-hidden">
      <div className="w-full max-w-[430px] h-screen md:h-[calc(100vh-48px)] bg-white md:rounded-[32px] md:shadow-[0_24px_48px_rgba(61,43,31,0.14)] md:border md:border-[#e7dfd3] overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {header && <div className="shrink-0">{header}</div>}
          <div
            className={
              bottomNav
                ? "flex-1 overflow-y-auto px-4 py-6 pb-24"
                : "flex-1 overflow-y-auto"
            }
          >
            {content}
          </div>
          {bottomNav && (
            <div className="shrink-0 bg-white border-t border-[#ede1d2]">
              {bottomNav}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileFrame;
