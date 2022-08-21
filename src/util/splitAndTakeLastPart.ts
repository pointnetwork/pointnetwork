export const splitAndTakeLastPart = (
    s: string,
    splitter: string,
    defaultIfSplitterNotFound: string|null = s
): string|null => {
    const parts = s.split(splitter);
    if (parts.length <= 1) {
        return defaultIfSplitterNotFound;
    } else {
        return parts[parts.length - 1];
    }
};