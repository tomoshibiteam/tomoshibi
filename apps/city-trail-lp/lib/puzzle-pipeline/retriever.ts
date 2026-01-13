/**
 * Retriever - 根拠収集モジュール
 * 
 * スポット座標からEvidencePackを生成する
 * Wikipedia API と Google Places API を使用
 */

import {
    Evidence,
    EvidencePack,
    EvidenceType,
    SourceType,
    SOURCE_CONFIDENCE,
} from './types';

// =============================================================================
// Wikipedia API
// =============================================================================

interface WikipediaPage {
    pageid: number;
    title: string;
    extract: string;
    fullurl: string;
}

interface WikipediaSearchResult {
    query?: {
        search: { title: string; pageid: number }[];
        pages?: Record<string, WikipediaPage>;
    };
}

/**
 * Wikipedia から施設情報を取得
 */
async function fetchWikipediaInfo(spotName: string, lang: string = 'ja'): Promise<{
    description: string;
    url: string;
    evidences: Evidence[];
} | null> {
    try {
        // 検索してページIDを取得
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: spotName,
            format: 'json',
            origin: '*',
        });

        const searchRes = await fetch(searchUrl);
        const searchData: WikipediaSearchResult = await searchRes.json();

        if (!searchData.query?.search?.length) {
            return null;
        }

        const pageTitle = searchData.query.search[0].title;

        // ページ内容を取得
        const pageUrl = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
            action: 'query',
            titles: pageTitle,
            prop: 'extracts|info',
            exintro: 'true',
            explaintext: 'true',
            inprop: 'url',
            format: 'json',
            origin: '*',
        });

        const pageRes = await fetch(pageUrl);
        const pageData: WikipediaSearchResult = await pageRes.json();

        if (!pageData.query?.pages) {
            return null;
        }

        const page = Object.values(pageData.query.pages)[0];
        if (!page || page.pageid < 0) {
            return null;
        }

        // 説明文から潜在的な手掛かりを抽出
        const evidences = extractEvidencesFromText(
            page.extract || '',
            page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
            'wikipedia'
        );

        return {
            description: page.extract || '',
            url: page.fullurl || '',
            evidences,
        };
    } catch (error) {
        console.error('Wikipedia fetch error:', error);
        return null;
    }
}

/**
 * テキストから潜在的な手掛かりを抽出
 */
function extractEvidencesFromText(
    text: string,
    sourceUrl: string,
    sourceType: SourceType
): Evidence[] {
    const evidences: Evidence[] = [];
    const now = new Date().toISOString();

    // パターンマッチングで手掛かり候補を抽出
    const patterns: { regex: RegExp; type: EvidenceType; description: string }[] = [
        // 年号パターン
        { regex: /(\d{4})年に?(建立|創建|完成|開業|設立)/g, type: 'inscription', description: '建立・創建年' },
        // 高さ・大きさ
        { regex: /(高さ|全長|全高)[約]?(\d+(?:\.\d+)?)\s*(メートル|m|センチ|cm)/g, type: 'monument', description: '寸法情報' },
        // 国宝・重要文化財
        { regex: /(国宝|重要文化財|世界遺産|登録有形文化財)/g, type: 'plaque', description: '文化財指定' },
        // 祀られている人物・神
        { regex: /(祭神|御祭神|祀られている)[はが]?([^。、]+)/g, type: 'signboard', description: '祭神情報' },
        // 正式名称
        { regex: /正式名称[はが]?「([^」]+)」/g, type: 'official_name', description: '正式名称' },
        // 別名
        { regex: /(別名|通称)[はが]?「([^」]+)」/g, type: 'official_name', description: '別名・通称' },
    ];

    for (const { regex, type, description } of patterns) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            evidences.push({
                id: `wiki-${type}-${evidences.length}`,
                type,
                content: match[0],
                source_url: sourceUrl,
                source_type: sourceType,
                is_permanent: true, // Wikipediaの情報は常設と仮定
                confidence: SOURCE_CONFIDENCE[sourceType],
                location_description: '現地案内板等で確認可能',
                retrieved_at: now,
            });
        }
    }

    return evidences;
}

// =============================================================================
// Google Geocoding API - スポット名から正確な座標を取得
// =============================================================================

/**
 * スポット名から正確な座標を取得（Google Geocoding API）
 */
/**
 * スポット名から正確な座標を取得（Google Geocoding API）
 * boundsを使用するために検索範囲の中心座標(centerLat, centerLng)を受け取る
 */
export async function geocodeSpotName(
    spotName: string,
    centerLat?: number,
    centerLng?: number,
    radiusKm: number = 2
): Promise<{ lat: number; lng: number; place_id?: string; formatted_address?: string } | null> {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('Google Maps API key not found for geocoding');
        return null;
    }

    try {
        // 日本のスポットとして検索
        let query = encodeURIComponent(`${spotName} 日本`);
        let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&language=ja&region=jp&key=${apiKey}`;

        // 中心座標がある場合はboundsを指定して優先検索させる
        if (centerLat && centerLng) {
            // 半径から矩形範囲(bounds)を計算 (簡易的: 1度≒111km)
            const latDelta = radiusKm / 111;
            const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

            const south = centerLat - latDelta;
            const north = centerLat + latDelta;
            const west = centerLng - lngDelta;
            const east = centerLng + lngDelta;

            url += `&bounds=${south},${west}|${north},${east}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
            console.warn('Geocoding API error:', res.status);
            return null;
        }

        const data = await res.json();

        if (data.status === 'OK' && data.results?.length > 0) {
            const result = data.results[0];
            const location = result.geometry?.location;

            // bounds指定しても範囲外が出る場合があるので、クライアント側でも距離チェックする
            if (location && centerLat && centerLng) {
                const distKm = calculateDistanceKm(centerLat, centerLng, location.lat, location.lng);
                // 指定範囲の2倍以上離れていたら警告して除外を検討（ここではnullを返して採用しない）
                if (distKm > radiusKm * 2) {
                    console.warn(`Geocoding result too far: ${spotName} is ${distKm.toFixed(1)}km away from center (limit: ${radiusKm}km)`);
                    return null;
                }
            }

            if (location) {
                return {
                    lat: location.lat,
                    lng: location.lng,
                    place_id: result.place_id,
                    formatted_address: result.formatted_address,
                };
            }
        }

        console.warn(`Geocoding failed for: ${spotName}`, data.status);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// =============================================================================
// Google Places API (省略可能 - API キーが必要)
// =============================================================================

/**
 * Google Places API から施設情報を取得
 * 注: VITE_GOOGLE_MAPS_API_KEY が必要
 */
async function fetchGooglePlacesInfo(
    lat: number,
    lng: number,
    spotName: string
): Promise<Evidence[]> {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('Google Places API key not found');
        return [];
    }

    try {
        // Places API Text Search を使用
        const url = `https://places.googleapis.com/v1/places:searchText`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types,places.editorialSummary',
            },
            body: JSON.stringify({
                textQuery: spotName,
                locationBias: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 500,
                    },
                },
                languageCode: 'ja',
            }),
        });

        if (!res.ok) {
            console.warn('Google Places API error:', res.status);
            return [];
        }

        const data = await res.json();
        const place = data.places?.[0];
        if (!place) return [];

        const evidences: Evidence[] = [];
        const now = new Date().toISOString();

        // 施設名を根拠として追加
        if (place.displayName?.text) {
            evidences.push({
                id: 'places-name-0',
                type: 'official_name',
                content: place.displayName.text,
                source_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spotName)}`,
                source_type: 'google_places',
                is_permanent: true,
                confidence: SOURCE_CONFIDENCE.google_places,
                location_description: '施設入口または看板',
                retrieved_at: now,
            });
        }

        return evidences;
    } catch (error) {
        console.error('Google Places fetch error:', error);
        return [];
    }
}

// =============================================================================
// Main Retriever Function
// =============================================================================

/**
 * スポット情報から EvidencePack を生成
 */
export async function retrieveEvidence(
    spotId: string,
    spotName: string,
    lat: number,
    lng: number
): Promise<EvidencePack> {
    const now = new Date().toISOString();

    // 並行してデータソースから取得
    const [wikiResult, placesEvidences] = await Promise.all([
        fetchWikipediaInfo(spotName),
        fetchGooglePlacesInfo(lat, lng, spotName),
    ]);

    // 根拠を統合
    const allEvidences: Evidence[] = [
        ...(wikiResult?.evidences || []),
        ...placesEvidences,
    ];

    // IDを再割り当て
    allEvidences.forEach((e, idx) => {
        e.id = `evidence-${spotId}-${idx}`;
    });

    // 充足度スコアを計算
    const sufficiencyScore = calculateSufficiency(allEvidences);

    return {
        spot_id: spotId,
        spot_name: spotName,
        lat,
        lng,
        official_description: wikiResult?.description || '',
        evidences: allEvidences,
        retrieved_at: now,
        sufficiency_score: sufficiencyScore,
    };
}

/**
 * 充足度スコアを計算
 * - 根拠の数と信頼度に基づく
 */
function calculateSufficiency(evidences: Evidence[]): number {
    if (evidences.length === 0) return 0;

    // 最低限の根拠数: 2個以上で0.5、5個以上で満点に近づく
    const countScore = Math.min(evidences.length / 5, 1);

    // 信頼度の平均
    const avgConfidence = evidences.reduce((sum, e) => sum + e.confidence, 0) / evidences.length;

    // 常設率
    const permanentRatio = evidences.filter(e => e.is_permanent).length / evidences.length;

    // 総合スコア
    return (countScore * 0.3 + avgConfidence * 0.5 + permanentRatio * 0.2);
}

/**
 * 複数スポットの根拠を一括取得
 */
export async function retrieveEvidencesForSpots(
    spots: { id: string; name: string; lat: number; lng: number }[]
): Promise<EvidencePack[]> {
    // 並行して取得（レート制限を考慮して最大5並行）
    const results: EvidencePack[] = [];
    const batchSize = 5;

    for (let i = 0; i < spots.length; i += batchSize) {
        const batch = spots.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(spot => retrieveEvidence(spot.id, spot.name, spot.lat, spot.lng))
        );
        results.push(...batchResults);
    }

    return results;
}
