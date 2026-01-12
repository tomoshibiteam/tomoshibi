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

export const safeParseJson = (text: string) => {
    const normalized = trimJsonBlock(text.trim());
    return JSON.parse(normalized);
};
