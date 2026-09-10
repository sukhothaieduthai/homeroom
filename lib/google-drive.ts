const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";

export class GoogleDriveService {
    async uploadFile(file: File, customFileName?: string): Promise<string | null> {
        if (!APPS_SCRIPT_URL) {
            console.error("[Drive] GOOGLE_APPS_SCRIPT_URL is not set in .env.local");
            return null;
        }

        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const base64 = buffer.toString("base64");
            const fileName = customFileName || file.name;

            // ❌ URLSearchParams double-encodes base64 (+, / → %2B, %2F)
            // ✅ Build body manually so base64 is only encoded once
            const body = [
                `file=${encodeURIComponent(base64)}`,
                `fileName=${encodeURIComponent(fileName)}`,
                `mimeType=${encodeURIComponent(file.type)}`,
            ].join("&");

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout

            let response: Response;
            try {
                response = await fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body,
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                console.error(`[Drive] HTTP Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const result = await response.json();

            if (result.success && result.url) {
                console.log(`[Drive] Uploaded: ${fileName} → ${result.url}`);
                return result.url;
            } else {
                console.error(`[Drive] Upload failed:`, result.error || "Unknown error");
                return null;
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.error(`[Drive] Upload timed out for: ${customFileName || file.name}`);
            } else {
                console.error(`[Drive] Exception during upload:`, error.message);
            }
            return null;
        }
    }

    extractFileId(url: string): string | null {
        const match =
            url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
            url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    async deleteFile(url: string): Promise<void> {
        if (!APPS_SCRIPT_URL) return;

        const fileId = this.extractFileId(url);
        if (!fileId) return;

        try {
            const body = `action=delete&fileId=${encodeURIComponent(fileId)}`;
            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body,
            });
            const result = await response.json();
            if (!result.success) {
                console.error("[Drive] Delete failed:", result.error);
            }
        } catch (error: any) {
            console.error("[Drive] Exception during file delete:", error.message);
        }
    }
}

export const driveService = new GoogleDriveService();
