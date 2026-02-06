const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzygNokPpe1ahjBw6CDz9lhMsxqrB08-rAytu6XZkCp6SJsYdTv6LTk035FqVy6-zYGTA/exec";

export class GoogleDriveService {
    async uploadFile(file: File): Promise<string | null> {
        try {
            // Convert file to base64
            const buffer = Buffer.from(await file.arrayBuffer());
            const base64 = buffer.toString('base64');

            // POST to Google Apps Script
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    file: base64,
                    fileName: file.name,
                    mimeType: file.type,
                }),
            });

            if (!response.ok) {
                console.error(`[Drive] HTTP Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const result = await response.json();

            if (result.success && result.url) {
                return result.url;
            } else {
                console.error(`[Drive] Upload failed:`, result.error || 'Unknown error');
                return null;
            }
        } catch (error: any) {
            console.error(`[Drive] Exception during upload:`, error.message);
            return null;
        }
    }
}

export const driveService = new GoogleDriveService();
