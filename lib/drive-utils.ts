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

    // Already a direct uc?export=view URL — return as-is
    if (url.includes("drive.google.com/uc?") && url.includes("export=view")) {
        return url;
    }

    // Already a googleusercontent or googleapis URL — return as-is
    if (url.includes("googleusercontent.com") || url.includes("googleapis.com")) {
        return url;
    }

    // Extract file ID from various Google Drive URL formats
    let fileId: string | null = null;

    // Format: https://drive.google.com/file/d/FILE_ID/view
    const viewMatch = url.match(/\/file\/d\/([^/?]+)/);
    if (viewMatch) {
        fileId = viewMatch[1];
    }

    // Format: https://drive.google.com/uc?export=view&id=FILE_ID
    // Format: https://drive.google.com/open?id=FILE_ID
    if (!fileId) {
        const idMatch = url.match(/[?&]id=([^&]+)/);
        if (idMatch) {
            fileId = idMatch[1];
        }
    }

    // If we found a file ID, construct the uc?export=view URL
    if (fileId) {
        // Remove any trailing query params from fileId
        fileId = fileId.split("?")[0];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // If no conversion needed/possible, return original
    return url;
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
