export function getValidUrl(url: string) {
    try {
        return new URL(url).href;
    } catch {
        return `https://${url}`;
    }
}

export function getHostname(url: string) {
    try {
        return new URL(url).hostname;
    } catch {
        try {
            return new URL(`https://${url}`).hostname;
        } catch {
            return url;
        }
    }
}
