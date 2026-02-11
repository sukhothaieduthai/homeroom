/**
 * Utility functions for Google Drive URL conversion
 */

/**
 * Converts a Google Drive URL to a direct image URL
 * Handles various Google Drive URL formats and converts them to direct view URLs
 * 
 * @param url - The original Google Drive URL
 * @returns Direct image URL that can be used in img tags
 */
export function convertToDriveDirectUrl(url: string): string {
    if (!url) return url;

    // If it's already a googleapis/googleusercontent URL, return as-is
    if (url.includes('googleusercontent.com') || url.includes('googleapis.com')) {
        return url;
    }

    // Extract file ID from various Google Drive URL formats
    let fileId = null;

    // Format: https://drive.google.com/uc?export=view&id=FILE_ID
    const ucMatch = url.match(/[?&]id=([^&]+)/);
    if (ucMatch) {
        fileId = ucMatch[1];
    }

    // Format: https://drive.google.com/file/d/FILE_ID/view
    const viewMatch = url.match(/\/file\/d\/([^\/]+)/);
    if (viewMatch) {
        fileId = viewMatch[1];
    }

    // Format: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/[?&]id=([^&]+)/);
    if (openMatch && !fileId) {
        fileId = openMatch[1];
    }

    // If we found a file ID, construct Googleusercontent URL (no CORS issues)
    if (fileId) {
        // Remove any query parameters from fileId
        fileId = fileId.split('?')[0];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // If no conversion needed/possible, return original
    return url;
}

/**
 * Converts multiple URLs (comma-separated) to direct URLs
 * 
 * @param urls - Comma-separated string of URLs
 * @returns Comma-separated string of converted URLs
 */
export function convertDriveUrls(urls: string): string {
    if (!urls) return urls;

    return urls
        .split(',')
        .map(url => convertToDriveDirectUrl(url.trim()))
        .join(',');
}
