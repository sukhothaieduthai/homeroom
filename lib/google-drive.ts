const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";

export class GoogleDriveService {
    async uploadFile(file: File, customFileName?: string): Promise<string | null> {
        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const base64 = buffer.toString('base64');
            const fileName = customFileName || file.name;

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    file: base64,
                    fileName: fileName,
                    mimeType: file.type,
                }),
            });

            if (!response.ok) {
                console.error(`[Drive] HTTP Error: ${response.status}`);
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

    extractFileId(url: string): string | null {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    async deleteFile(url: string): Promise<void> {
        const fileId = this.extractFileId(url);
        if (!fileId) return;

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'delete', fileId }),
            });
            const result = await response.json();
            if (!result.success) {
                console.error('[Drive] Delete failed:', result.error);
            }
        } catch (error: any) {
            console.error('[Drive] Exception during file delete:', error.message);
        }
    }
}

export const driveService = new GoogleDriveService();
