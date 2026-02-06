import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Types
export interface Advisor {
    id: string;
    name: string;
    year: number;
    department: string;
    classLevel: string;
    room: string;
}

export interface HomeroomReport {
    id: string;
    term: string;
    academicYear: string;
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
// Handle private key with robust newline replacement
const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
const GOOGLE_PRIVATE_KEY = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, '\n') : rawKey;

// Mock Data
const MOCK_ADVISORS: Advisor[] = [
    { id: '1', name: 'ครูสมชาย ใจดี', year: 2568, department: 'เทคโนโลยีสารสนเทศ', classLevel: 'ปวช. 1', room: '1/1' },
    { id: '1-2', name: 'ครูสมชาย ใจดี', year: 2568, department: 'เทคโนโลยีสารสนเทศ', classLevel: 'ปวช. 3', room: '1/3' },
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
            this.doc = null; // Ensure doc is null if connection fails
        }
    }

    async getAdvisors(year: number): Promise<Advisor[]> {
        if (!this.isConnected) {
            await this.connect();
        }

        if (!this.doc) {
            console.warn("Using Mock Data (Not Connected)");
            return MOCK_ADVISORS.filter(a => a.year === year);
        }

        try {
            const sheet = this.doc.sheetsByTitle['Advisors'];
            if (!sheet) {
                console.warn("Sheet 'Advisor' not found. Using Mock Data.");
                return MOCK_ADVISORS.filter(a => a.year === year);
            }

            const rows = await sheet.getRows();
            const advisors: Advisor[] = rows.map((row, index) => {
                const name = row.get('ครูที่ปรึกษา') || '';
                const room = row.get('ห้อง') || '';
                const classLevel = row.get('ระดับชั้น') || '';
                const department = row.get('สาขาวิชา') || '';
                const id = `${name}-${classLevel}-${room}`.replace(/\s+/g, '-');

                return {
                    id: id || `generated-${index}`,
                    name,
                    year: year,
                    department,
                    classLevel,
                    room,
                };
            });

            return advisors;
        } catch (error) {
            console.error("Error fetching advisors:", error);
            return MOCK_ADVISORS.filter(a => a.year === year);
        }
    }

    async saveReport(report: Omit<HomeroomReport, 'id' | 'timestamp'>): Promise<string> {
        if (!this.isConnected) {
            await this.connect();
        }

        const newReport: HomeroomReport = {
            ...report,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
        };

        if (!this.doc) {
            console.warn("Using Mock Data (Not Connected) for Save");
            MOCK_REPORTS.push(newReport);
            return newReport.id;
        }

        try {
            const headers = [
                'id', 'term', 'academicYear', 'week', 'date', 
                'advisorName', 'department', 'classLevel', 'room', 
                'topic', 'totalStudents', 'presentStudents', 
                'absentStudents', 'photoUrl', 'timestamp'
            ];

            const rowData = {
                id: newReport.id,
                term: newReport.term,
                academicYear: newReport.academicYear,
                week: newReport.week,
                date: newReport.date,
                advisorName: newReport.advisorName,
                department: newReport.department,
                classLevel: newReport.classLevel,
                room: newReport.room,
                topic: newReport.topic,
                totalStudents: newReport.totalStudents,
                presentStudents: newReport.presentStudents,
                absentStudents: newReport.absentStudents,
                photoUrl: newReport.photoUrl || '',
                timestamp: newReport.timestamp,
            };


            let sheet = this.doc.sheetsByTitle['Reports'];
            if (!sheet) {
                try {
                    sheet = await this.doc.addSheet({ title: 'Reports' });
                    await sheet.setHeaderRow(headers);
                } catch (e) {
                    console.error("Error creating sheet:", e);
                }
            }

            if (sheet) {
                await sheet.addRow(rowData);
            }

            const subSheetTitle = `${newReport.term}/${newReport.academicYear}`;
            let subSheet = this.doc.sheetsByTitle[subSheetTitle];

            if (!subSheet) {
                try {
                    subSheet = await this.doc.addSheet({ title: subSheetTitle });
                    await subSheet.setHeaderRow(headers);
                } catch (e) {
                    subSheet = this.doc.sheetsByTitle[subSheetTitle];
                }
            }

            if (subSheet) {
                await subSheet.addRow(rowData);
            }

            return newReport.id;
        } catch (error) {
            console.error("Error saving report:", error);
            throw error;
        }
    }

    async getReports(): Promise<HomeroomReport[]> {
        if (!this.isConnected) {
            await this.connect();
        }

        if (!this.doc) return [...MOCK_REPORTS];

        try {
            const sheet = this.doc.sheetsByTitle['Reports'];
            if (!sheet) return [...MOCK_REPORTS];

            const rows = await sheet.getRows();
            return rows.map(row => ({
                id: row.get('id'),
                term: row.get('term') || '',
                academicYear: row.get('academicYear') || '',
                week: Number(row.get('week')),
                date: row.get('date'),
                advisorName: row.get('advisorName'),
                department: row.get('department'),
                classLevel: row.get('classLevel'),
                room: row.get('room'),
                topic: row.get('topic'),
                totalStudents: Number(row.get('totalStudents')),
                presentStudents: Number(row.get('presentStudents')),
                absentStudents: Number(row.get('absentStudents')),
                photoUrl: row.get('photoUrl'),
                timestamp: row.get('timestamp'),
            }));
        } catch (error) {
            console.error("Error fetching reports:", error);
            return [...MOCK_REPORTS];
        }
    }
}

export const sheetService = new GoogleSheetService();
