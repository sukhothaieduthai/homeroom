export type RiskReason = 'ลาออก' | 'พักการเรียน' | 'พ้นสภาพ' | 'ไม่มาเรียน (มีรายชื่อ)';
export type FollowUpMethod = 'โทรศัพท์/Line' | 'เยี่ยมบ้าน';

export interface StudentTrackingRow {
    id?: string;
    name: string;
    resign: boolean;   // ลาออก
    pause: boolean;    // พักการเรียน
    expelled: boolean; // พ้นสภาพ
    absent: boolean;   // ไม่มาเรียน (มีรายชื่อ)
    call: boolean;     // โทรศัพท์/Line
    visit: boolean;    // เยี่ยมบ้าน
    reason?: RiskReason | '';
    followUpMethod?: FollowUpMethod | '';
}

export interface StudentTrackingData {
    rows: StudentTrackingRow[];
    notes: string;
    advisorSign1?: string;
    advisorSign2?: string;
}
