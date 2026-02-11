"use server";

import { sheetService, Advisor, HomeroomReport } from "@/lib/google-sheets";
import { driveService } from "@/lib/google-drive";

export async function getAdvisorsAction(): Promise<Advisor[]> {
    try {
        await sheetService.connect();
        const advisors = await sheetService.getAdvisors();
        return advisors;
    } catch (error) {
        console.error("Error in getAdvisorsAction:", error);
        return [];
    }
}

export async function addAdvisorAction(advisor: Omit<Advisor, 'id'>) {
    try {
        await sheetService.connect();
        await sheetService.addAdvisor(advisor);
        return { success: true };
    } catch (error) {
        console.error("Failed to add advisor:", error);
        return { success: false, error: "Failed to add advisor" };
    }
}

export async function updateAdvisorAction(oldId: string, newData: Omit<Advisor, 'id'>) {
    try {
        await sheetService.connect();
        await sheetService.updateAdvisor(oldId, newData);
        return { success: true };
    } catch (error) {
        console.error("Failed to update advisor:", error);
        return { success: false, error: "Failed to update advisor" };
    }
}

export async function deleteAdvisorAction(id: string) {
    try {
        await sheetService.connect();
        await sheetService.deleteAdvisor(id);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete advisor:", error);
        return { success: false, error: "Failed to delete advisor" };
    }
}

export async function saveReportAction(report: Omit<HomeroomReport, 'id' | 'timestamp'>): Promise<string> {
    await sheetService.connect();
    try {
        const allAdvisors = await sheetService.getAdvisors();
        
        const matchedAdvisors = allAdvisors.filter(a =>
            a.classLevel === report.classLevel &&
            a.room === report.room &&
            a.department === report.department
        );

        if (matchedAdvisors.length > 0) {
            const combinedNames = matchedAdvisors.map(a => a.name).join(" และ ");
            report.advisorName = combinedNames;
        }
        
    } catch (error) {
        console.error("Error auto-filling co-advisors:", error);
    }
    return sheetService.saveReport(report);
}

export async function getReportsAction(): Promise<HomeroomReport[]> {
    await sheetService.connect();
    return sheetService.getReports();
}

interface UploadMetadata {
    advisorName: string;
    term: string;
    date: string;
    topic: string;
}

export async function uploadPhotosAction(formData: FormData): Promise<string[]> {
    try {
        const files = formData.getAll("files") as File[];
        const uploadedUrls: string[] = [];

        if (!files || files.length === 0) {
            return [];
        }

        // Extract metadata from formData
        const metadata: UploadMetadata = {
            advisorName: formData.get("advisorName") as string || "Unknown",
            term: formData.get("term") as string || "",
            date: formData.get("date") as string || "",
            topic: formData.get("topic") as string || ""
        };

        // Create a sanitized topic (remove special characters, limit length)
        const sanitizeTopic = (topic: string): string => {
            return topic
                .replace(/[^ก-๙a-zA-Z0-9\s]/g, '') // Remove special chars except Thai, English, numbers, spaces
                .trim()
                .substring(0, 50) // Limit to 50 characters
                .replace(/\s+/g, '_'); // Replace spaces with underscores
        };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExtension = file.name.split('.').pop() || 'jpg';

            // Format: {ชื่อครู}_{เทอม}_{วันที่}_{กิจกรรม}_{index}.{ext}
            const customFileName = `${metadata.advisorName}_T${metadata.term}_${metadata.date}_${sanitizeTopic(metadata.topic)}_${i + 1}.${fileExtension}`;

            try {
                const driveLink = await driveService.uploadFile(file, customFileName);

                if (driveLink) {
                    uploadedUrls.push(driveLink);
                } else {
                    console.error(`[Upload] Failed to get URL for: ${customFileName}`);
                }
            } catch (error) {
                console.error(`[Upload] Exception uploading ${customFileName}:`, error);
            }
        }

        return uploadedUrls;
    } catch (error) {
        console.error("[Upload] Error in uploadPhotosAction:", error);
        throw error;
    }
}