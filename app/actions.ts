"use server";

import { sheetService, Advisor, HomeroomReport } from "@/lib/google-sheets";
import { driveService } from "@/lib/google-drive";

export async function getAdvisorsAction(year: number): Promise<Advisor[]> {
    try {
        await sheetService.connect();
        const advisors = await sheetService.getAdvisors(year);
        return advisors;
    } catch (error) {
        console.error("Error in getAdvisorsAction:", error);
        return [];
    }
}

export async function saveReportAction(report: Omit<HomeroomReport, 'id' | 'timestamp'>): Promise<string> {
    await sheetService.connect();
    try {
        const year = parseInt(report.academicYear);

        if (!isNaN(year)) {
            const allAdvisors = await sheetService.getAdvisors(year);
            const matchedAdvisors = allAdvisors.filter(a =>
                a.classLevel === report.classLevel &&
                a.room === report.room &&
                a.department === report.department
            );

            if (matchedAdvisors.length > 0) {
                const combinedNames = matchedAdvisors.map(a => a.name).join(" และ ");
                report.advisorName = combinedNames;
            }
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

export async function uploadPhotosAction(formData: FormData): Promise<string[]> {
    try {
        const files = formData.getAll("files") as File[];
        const uploadedUrls: string[] = [];

        if (!files || files.length === 0) {
            return [];
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const driveLink = await driveService.uploadFile(file);

                if (driveLink) {
                    uploadedUrls.push(driveLink);
                } else {
                    console.error(`[Upload] Failed to get URL for: ${file.name}`);
                }
            } catch (error) {
                console.error(`[Upload] Exception uploading ${file.name}:`, error);
            }
        }

        return uploadedUrls;
    } catch (error) {
        console.error("[Upload] Error in uploadPhotosAction:", error);
        throw error;
    }
}