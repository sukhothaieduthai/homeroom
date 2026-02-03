"use server";

import { sheetService, Advisor, HomeroomReport } from "@/lib/google-sheets";

export async function getAdvisorsAction(year: number): Promise<Advisor[]> {
    await sheetService.connect();
    return sheetService.getAdvisors(year);
}

export async function saveReportAction(report: Omit<HomeroomReport, 'id' | 'timestamp'>): Promise<string> {
    await sheetService.connect();
    return sheetService.saveReport(report);
}

export async function getReportsAction(): Promise<HomeroomReport[]> {
    await sheetService.connect();
    return sheetService.getReports();
}
