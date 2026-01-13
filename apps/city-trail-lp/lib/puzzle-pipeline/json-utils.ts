export const trimJsonBlock = (raw: string): string => {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const firstObject = cleaned.indexOf('{');
    const firstArray = cleaned.indexOf('[');
    const useArray = firstArray !== -1 && (firstArray < firstObject || firstObject === -1);
    const start = useArray ? firstArray : firstObject;
    if (start === -1) return cleaned;
    const end = useArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
    if (end >= start) {
        return cleaned.slice(start, end + 1);
    }
    return cleaned.slice(start);
};

const escapeInvalidJson = (raw: string): string => {
    let inString = false;
    let escaped = false;
    let result = '';
    for (let i = 0; i < raw.length; i += 1) {
        const ch = raw[i];
        if (escaped) {
            escaped = false;
            result += ch;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            result += ch;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            result += ch;
            continue;
        }
        if (inString && (ch === '\n' || ch === '\r')) {
            result += '\\n';
            continue;
        }
        result += ch;
    }
    return result;
};

const trimToBalancedJson = (raw: string): string => {
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    let lastBalanced = -1;
    for (let i = 0; i < raw.length; i += 1) {
        const ch = raw[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{' || ch === '[') {
            stack.push(ch);
            continue;
        }
        if (ch === '}' || ch === ']') {
            if (stack.length === 0) continue;
            stack.pop();
            if (stack.length === 0) {
                lastBalanced = i;
            }
        }
    }
    if (lastBalanced !== -1) {
        return raw.slice(0, lastBalanced + 1);
    }
    return raw;
};

/**
 * 途中で切れたJSONを修復する試み
 * 配列やオブジェクトが閉じていない場合に閉じる
 */
const repairTruncatedJson = (raw: string): string => {
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    let lastValidPos = 0;

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            // 文字列が閉じていない場合
            if (inString) {
                lastValidPos = i;
            }
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (ch === '{' || ch === '[') {
            stack.push(ch);
            continue;
        }
        if (ch === '}' || ch === ']') {
            if (stack.length > 0) {
                stack.pop();
                lastValidPos = i;
            }
        }
        if (ch === ',' || ch === ':') {
            // これらの後に値があるはず
        }
    }

    // 文字列が閉じていない場合、最後の引用符を見つけて閉じる
    if (inString) {
        // 文字列を閉じる
        raw = raw + '"';
    }

    // スタックに残っている開き括弧を閉じる
    let repaired = raw;
    while (stack.length > 0) {
        const open = stack.pop();
        if (open === '{') {
            // 最後がカンマなら削除
            repaired = repaired.replace(/,\s*$/, '');
            repaired += '}';
        } else if (open === '[') {
            repaired = repaired.replace(/,\s*$/, '');
            repaired += ']';
        }
    }

    return repaired;
};

/**
 * 部分的に有効な配列要素を抽出
 */
const extractValidArrayElements = (raw: string): any[] => {
    // 配列の開始を見つける
    const arrayStart = raw.indexOf('[');
    if (arrayStart === -1) return [];

    const content = raw.slice(arrayStart + 1);
    const elements: any[] = [];
    let depth = 0;
    let start = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (ch === '{' || ch === '[') {
            depth++;
        } else if (ch === '}' || ch === ']') {
            depth--;
            if (depth === -1) break; // 配列の終わり
        } else if (ch === ',' && depth === 0) {
            // 要素の区切り
            const element = content.slice(start, i).trim();
            if (element) {
                try {
                    elements.push(JSON.parse(element));
                } catch {
                    // パースできない要素はスキップ
                }
            }
            start = i + 1;
        }
    }

    // 最後の要素
    const lastElement = content.slice(start).replace(/[\]\s]+$/, '').trim();
    if (lastElement) {
        try {
            elements.push(JSON.parse(lastElement));
        } catch {
            // 最後の要素がパースできない場合はスキップ
        }
    }

    return elements;
};

export const safeParseJson = (text: string) => {
    const normalized = trimJsonBlock(text.trim());

    // 1. まず通常のパースを試みる
    try {
        return JSON.parse(normalized);
    } catch (error) {
        console.warn('[JSON Parse] First attempt failed, trying escape fix');
    }

    // 2. エスケープを修正してパース
    const escaped = escapeInvalidJson(normalized);
    try {
        return JSON.parse(escaped);
    } catch (error) {
        console.warn('[JSON Parse] Escape fix failed, trying balanced trim');
    }

    // 3. バランスの取れた位置でトリム
    const trimmed = trimToBalancedJson(escaped);
    try {
        return JSON.parse(trimmed);
    } catch (error) {
        console.warn('[JSON Parse] Balanced trim failed, trying repair');
    }

    // 4. 途中で切れたJSONを修復
    const repaired = repairTruncatedJson(escaped);
    try {
        return JSON.parse(repaired);
    } catch (error) {
        console.warn('[JSON Parse] Repair failed, extracting valid elements');
    }

    // 5. 配列の場合、有効な要素だけを抽出
    if (normalized.trim().startsWith('[')) {
        const elements = extractValidArrayElements(normalized);
        if (elements.length > 0) {
            console.log(`[JSON Parse] Extracted ${elements.length} valid elements from truncated array`);
            return elements;
        }
    }

    // 6. 最終手段: エラーを投げる
    console.error('[JSON Parse] All recovery attempts failed');
    throw new Error('Failed to parse JSON after all recovery attempts');
};
