import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff7ec] text-[#3d2b1f]">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-[#8b6a4a]">ページが見つかりませんでした</p>
        <Link to="/" className="inline-block px-4 py-2 rounded-full bg-[#ff8b3d] text-white font-semibold shadow-card">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
