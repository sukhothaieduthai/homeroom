import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Types
export interface Advisor {
    id: string;
    name: string;
    year: number; // e.g., 2568
    department: string; // e.g., "Information Technology"
    classLevel: string; // e.g., "ปวช. 1"
    room: string; // e.g., "1/1"
}

export interface HomeroomReport {
    id: string;
    week: number;
    date: string;
    advisorName: string;
    department: string;
    classLevel: string;
    room: string;
    topic: string;
    totalStudents: number;
    presentStudents: number;
    absentStudents: number;
    photoUrl?: string;
    timestamp: string;
}

// Config
const SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "";

// Mock Data
const MOCK_ADVISORS: Advisor[] = [
    { id: '1', name: 'ครูสมชาย ใจดี', year: 2568, department: 'เทคโนโลยีสารสนเทศ', classLevel: 'ปวช. 1', room: '1/1' },
    { id: '2', name: 'ครูนิภา รักเรียน', year: 2568, department: 'เทคโนโลยีสารสนเทศ', classLevel: 'ปวช. 2', room: '1/2' },
    { id: '3', name: 'ครูวิชัย สอนเก่ง', year: 2568, department: 'บัญชี', classLevel: 'ปวช. 1', room: '1/1' },
];

const MOCK_REPORTS: HomeroomReport[] = [];

// Service
export class GoogleSheetService {
    private doc: GoogleSpreadsheet | null = null;
    private isConnected = false;

    async connect() {
        if (this.isConnected) return;

        if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
            console.warn("Google Sheets Credentials not found. Using Mock Mode.");
            return;
        }

        try {
            const jwt = new JWT({
                email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
                key: GOOGLE_PRIVATE_KEY,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.doc = new GoogleSpreadsheet(SHEET_ID, jwt);
            await this.doc.loadInfo();
            this.isConnected = true;
        } catch (error) {
            console.error("Failed to connect to Google Sheets:", error);
        }
    }

    async getAdvisors(year: number): Promise<Advisor[]> {
        if (!this.isConnected) {
            return MOCK_ADVISORS.filter(a => a.year === year);
        }
        // TODO: Implement Real Fetch Logic
        // For now, return mock even if connected (until sheet structure is defined)
        return MOCK_ADVISORS;
    }

    async saveReport(report: Omit<HomeroomReport, 'id' | 'timestamp'>): Promise<string> {
        const newReport: HomeroomReport = {
            ...report,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
        };

        if (!this.isConnected) {
            MOCK_REPORTS.push(newReport);
            return newReport.id;
        }

        // TODO: Implement Real Save Logic
        return newReport.id;
    }

    async getReports(): Promise<HomeroomReport[]> {
        if (!this.isConnected) {
            return [...MOCK_REPORTS];
        }
        return [...MOCK_REPORTS]; // Fallback
    }
}

export const sheetService = new GoogleSheetService();
