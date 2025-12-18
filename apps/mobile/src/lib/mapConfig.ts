const rawKey = import.meta.env.VITE_MAPTILER_KEY;
// 空文字や未設定もデモキー扱いにする
export const MAPTILER_KEY =
  rawKey && String(rawKey).trim().length > 0
    ? String(rawKey).trim()
    : "Get_Your_Own_OpIi9ZULNHzrESv6T2vK";

const isDefaultKey = MAPTILER_KEY.includes("Get_Your_Own");
export const MAPTILER_STYLE = isDefaultKey
  ? "https://demotiles.maplibre.org/style.json"
  : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

export const DEFAULT_CENTER = { lat: 35.6804, lng: 139.769 }; // Tokyo付近
export const DEFAULT_ZOOM = 11;

let maplibrePromise: Promise<any> | null = null;

export const loadMaplibre = () => {
  if ((window as any).maplibregl) return Promise.resolve((window as any).maplibregl);
  if (maplibrePromise) return maplibrePromise;
  maplibrePromise = new Promise<any>((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => reject(new Error("MapLibre failed to load"));
    document.head.appendChild(script);
  });
  return maplibrePromise;
};
