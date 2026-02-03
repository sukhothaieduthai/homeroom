"use server";

import { sheetService, Advisor, HomeroomReport } from "@/lib/google-sheets";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function getAdvisorsAction(year: number): Promise<Advisor[]> {
    console.log(`Fetching advisors for year: ${year}...`);
    try {
        await sheetService.connect();
        const advisors = await sheetService.getAdvisors(year);
        console.log(`Fetched ${advisors.length} advisors.`);
        return advisors;
    } catch (error) {
        console.error("Error in getAdvisorsAction:", error);
        return [];
    }
}

export async function saveReportAction(report: Omit<HomeroomReport, 'id' | 'timestamp'>): Promise<string> {
    console.log("Saving report...");
    await sheetService.connect();
    return sheetService.saveReport(report);
}

export async function getReportsAction(): Promise<HomeroomReport[]> {
    await sheetService.connect();
    return sheetService.getReports();
}

export async function uploadPhotosAction(formData: FormData): Promise<string[]> {
    const files = formData.getAll("files") as File[];
    const uploadedUrls: string[] = [];

    if (!files || files.length === 0) return [];

    const uploadDir = path.join(process.cwd(), "public/uploads");

    // Ensure directory exists
    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {
        // Ignore if exists
    }

    for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        // Clean filename: remove non-ascii or spaces to be safe
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${Date.now()}-${safeName}`;
        const filepath = path.join(uploadDir, filename);

        try {
            await writeFile(filepath, buffer);
            uploadedUrls.push(`/uploads/${filename}`);
        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
        }
    }

    return uploadedUrls;
}
