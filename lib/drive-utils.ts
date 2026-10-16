/**
 * Utility functions for Google Drive URL conversion
 */

/**
 * Converts a Google Drive URL to a direct image URL.
 * Handles various Google Drive URL formats and converts them to
 * the uc?export=view format which works for direct embedding.
 *
 * @param url - The original Google Drive URL
 * @returns Direct image URL that can be used in img tags and Puppeteer
 */
export function convertToDriveDirectUrl(url: string): string {
    if (!url) return url;

    const trimmed = url.trim();

    // Already a direct lh3/googleusercontent CDN link — return as-is
    if (trimmed.includes("lh3.googleusercontent.com/d/") || trimmed.includes("googleapis.com")) {
        return trimmed;
    }

    // Extract file ID from various Google Drive URL formats
    let fileId: string | null = null;

    // Format: https://drive.google.com/file/d/FILE_ID/view
    const viewMatch = trimmed.match(/\/file\/d\/([^/?]+)/);
    if (viewMatch) {
        fileId = viewMatch[1];
    }

    // Format: https://drive.google.com/uc?export=view&id=FILE_ID or open?id=FILE_ID
    if (!fileId) {
        const idMatch = trimmed.match(/[?&]id=([^&]+)/);
        if (idMatch) {
            fileId = idMatch[1];
        }
    }

    // Format: https://drive.google.com/thumbnail?id=FILE_ID or /d/FILE_ID
    if (!fileId) {
        const pathMatch = trimmed.match(/\/d\/([^/?]+)/);
        if (pathMatch) {
            fileId = pathMatch[1];
        }
    }

    // If we found a file ID, construct direct lh3 image CDN URL
    if (fileId) {
        fileId = fileId.split("?")[0].split("&")[0];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // If raw 28+ character Drive File ID was passed directly
    if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
        return `https://lh3.googleusercontent.com/d/${trimmed}`;
    }

    return trimmed;
}

/**
 * Converts multiple URLs (comma-separated) to direct URLs.
 *
 * @param urls - Comma-separated string of URLs
 * @returns Comma-separated string of converted URLs
 */
export function convertDriveUrls(urls: string): string {
    if (!urls) return urls;

    return urls
        .split(",")
        .map((url) => convertToDriveDirectUrl(url.trim()))
        .join(",");
}
