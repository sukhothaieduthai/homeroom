import { HomeroomReport } from "./google-sheets";

export interface WeekSchedule {
    week: number;
    date: string;          // ISO Format YYYY-MM-DD
    thaiDate: string;      // e.g. "21 ต.ค. 2569" or "21 ตุลาคม 2569"
    fullThaiDate: string;  // e.g. "21 ตุลาคม 2569"
    notes?: string;
}

export const SEMESTER_2_2569_SCHEDULE: WeekSchedule[] = [
    { week: 1,  date: "2026-10-21", thaiDate: "21 ต.ค. 2569", fullThaiDate: "21 ตุลาคม 2569", notes: "เปิดภาคเรียนที่ 2/2569 / ปฐมนิเทศประจำชั้น" },
    { week: 2,  date: "2026-10-28", thaiDate: "28 ต.ค. 2569", fullThaiDate: "28 ตุลาคม 2569", notes: "ติดตามการลงทะเบียนและค่าธรรมเนียมการศึกษา" },
    { week: 3,  date: "2026-11-04", thaiDate: "4 พ.ย. 2569",  fullThaiDate: "4 พฤศจิกายน 2569", notes: "การแต่งกายและระเบียบวินัยวิทยาลัยอาชีวศึกษา" },
    { week: 4,  date: "2026-11-11", thaiDate: "11 พ.ย. 2569", fullThaiDate: "11 พฤศจิกายน 2569", notes: "การรณรงค์ป้องกันยาเสพติดและสิ่งมอมเมา" },
    { week: 5,  date: "2026-11-18", thaiDate: "18 พ.ย. 2569", fullThaiDate: "18 พฤศจิกายน 2569", notes: "การวางแผนการเรียนและการทำกิจกรรมชมรม" },
    { week: 6,  date: "2026-11-25", thaiDate: "25 พ.ย. 2569", fullThaiDate: "25 พฤศจิกายน 2569", notes: "วันสมเด็จพระมหาธีรราชเจ้า / กิจกรรมลูกเสือวิสามัญ" },
    { week: 7,  date: "2026-12-02", thaiDate: "2 ธ.ค. 2569",  fullThaiDate: "2 ธันวาคม 2569", notes: "เตรียมความพร้อมกิจกรรมวันพ่อแห่งชาติ" },
    { week: 8,  date: "2026-12-09", thaiDate: "9 ธ.ค. 2569",  fullThaiDate: "9 ธันวาคม 2569", notes: "ติดตามผลการเรียนก่อนสอบกลางภาค" },
    { week: 9,  date: "2026-12-16", thaiDate: "16 ธ.ค. 2569", fullThaiDate: "16 ธันวาคม 2569", notes: "สัปดาห์สอบกลางภาคเรียนที่ 2/2569" },
    { week: 10, date: "2026-12-23", thaiDate: "23 ธ.ค. 2569", fullThaiDate: "23 ธันวาคม 2569", notes: "ประเมินผลการเรียนครึ่งภาคเรียน / แจ้งเตือน มส." },
    { week: 11, date: "2026-12-30", thaiDate: "30 ธ.ค. 2569", fullThaiDate: "30 ธันวาคม 2569", notes: "กิจกรรมส่งท้ายปีเก่าต้อนรับปีใหม่ / ปลอดภัยทางถนน" },
    { week: 12, date: "2027-01-06", thaiDate: "6 ม.ค. 2570",  fullThaiDate: "6 มกราคม 2570", notes: "การเตรียมตัวสอบมาตรฐานวิชาชีพ / บันทึกความดี" },
    { week: 13, date: "2027-01-13", thaiDate: "13 ม.ค. 2570", fullThaiDate: "13 มกราคม 2570", notes: "กิจกรรมวันเด็กแห่งชาติและวันครู" },
    { week: 14, date: "2027-01-20", thaiDate: "20 ม.ค. 2570", fullThaiDate: "20 มกราคม 2570", notes: "การส่งเสริมการมีงานทำและการฝึกงาน (DVE)" },
    { week: 15, date: "2027-01-27", thaiDate: "27 ม.ค. 2570", fullThaiDate: "27 มกราคม 2570", notes: "ตรวจสอบเวลาเรียน 80% ก่อนสอบปลายภาค" },
    { week: 16, date: "2027-02-03", thaiDate: "3 ก.พ. 2570",  fullThaiDate: "3 กุมภาพันธ์ 2570", notes: "การแก้กิจกรรมและส่งงานคั่งค้าง" },
    { week: 17, date: "2027-02-10", thaiDate: "10 ก.พ. 2570", fullThaiDate: "10 กุมภาพันธ์ 2570", notes: "ปัจฉิมนิเทศนักเรียนนักศึกษาที่สำเร็จการศึกษา" },
    { week: 18, date: "2027-02-17", thaiDate: "17 ก.พ. 2570", fullThaiDate: "17 กุมภาพันธ์ 2570", notes: "สัปดาห์สอบปลายภาคเรียนที่ 2/2569" },
];

/**
 * Returns pre-mapped date & details for a given week number in Semester 2/2569
 */
export function getScheduleForWeek(weekNumber: number): WeekSchedule | undefined {
    return SEMESTER_2_2569_SCHEDULE.find(s => s.week === Number(weekNumber));
}

/**
 * Converts an ISO date string (YYYY-MM-DD) into Thai formal string e.g. "21 ตุลาคม 2569"
 */
export function formatThaiDate(isoDateString: string): string {
    if (!isoDateString) return "";
    try {
        const [year, month, day] = isoDateString.split("-").map(Number);
        if (!year || !month || !day) return isoDateString;

        const thaiMonths = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        const thaiYear = year > 2500 ? year : year + 543;
        return `${day} ${thaiMonths[month - 1]} ${thaiYear}`;
    } catch {
        return isoDateString;
    }
}

/**
 * Filters the 18 semester weeks to only return weeks not yet submitted
 * by the selected classroom and advisor.
 */
export function getAvailableWeeks(
    allReports: HomeroomReport[],
    criteria: {
        term: string;
        academicYear: string;
        classLevel?: string;
        room?: string;
        department?: string;
    }
): WeekSchedule[] {
    if (!criteria.classLevel || !criteria.room) {
        return SEMESTER_2_2569_SCHEDULE;
    }

    // Identify weeks already recorded for this classroom in this semester
    const recordedWeeks = new Set(
        allReports
            .filter(r =>
                String(r.term) === String(criteria.term) &&
                String(r.academicYear) === String(criteria.academicYear) &&
                r.classLevel === criteria.classLevel &&
                r.room === criteria.room &&
                (!criteria.department || r.department === criteria.department)
            )
            .map(r => Number(r.week))
    );

    // Return remaining unrecorded weeks from the 18-week schedule
    return SEMESTER_2_2569_SCHEDULE.filter(s => !recordedWeeks.has(s.week));
}
