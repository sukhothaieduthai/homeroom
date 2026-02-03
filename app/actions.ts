"use server";

import { sheetService, Advisor, HomeroomReport } from "@/lib/google-sheets";

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
