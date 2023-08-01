export function substringBeforeFirst(text: string, ...patterns: string[]): [string, number] {
    const index = Math.min(...patterns.map(pattern => text.indexOf(pattern))
        .filter(index => index > -1)) ?? undefined;
    return [text.substring(0, index), index];
}

export function substringAfterLast(text: string, ...patterns: string[]): [string, number] {
    const index = Math.max(...patterns.map(pattern => [text.lastIndexOf(pattern), pattern.length])
        .filter(index => index[0] > -1)
        .map(index => index[0] + index[1])) ?? 0;
    return [text.substring(index), index];
}