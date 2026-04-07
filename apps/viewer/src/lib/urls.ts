export function getValidUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return `https://${url}`;
        }
        return parsed.href;
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
