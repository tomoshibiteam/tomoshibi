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

export const safeParseJson = (text: string) => {
    const normalized = trimJsonBlock(text.trim());
    try {
        return JSON.parse(normalized);
    } catch (error) {
        const escaped = escapeInvalidJson(normalized);
        try {
            return JSON.parse(escaped);
        } catch (nestedError) {
            const trimmed = trimToBalancedJson(escaped);
            return JSON.parse(trimmed);
        }
    }
};
