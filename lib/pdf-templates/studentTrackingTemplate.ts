import { StudentTrackingRow } from "@/types/tracking";

export interface StudentTrackingTemplateData {
    term: string;
    academicYear: string;
    advisor: {
        name: string;
        department?: string;
        classLevel?: string;
        room?: string;
    };
    rows?: StudentTrackingRow[];
    notes?: string;
    advisorSign1?: string;
    advisorSign2?: string;
}

export function getStudentTrackingHTML(data: StudentTrackingTemplateData): string {
    const { term, academicYear, advisor, notes, advisorSign1, advisorSign2 } = data;
    const trackingRows = data.rows || [];

    // Guarantee at least 12 rows for official form layout
    const TOTAL_ROWS = 12;
    const filledRows: Array<StudentTrackingRow | null> = [...trackingRows];
    while (filledRows.length < TOTAL_ROWS) {
        filledRows.push(null);
    }

    const checkMark = (val?: boolean) => (val ? "✓" : "");

    const dotLine = (width = "100%") =>
        `<span style="display:inline-block;width:${width};border-bottom:1px dotted #555;margin:0 4px;vertical-align:bottom;height:1em;"></span>`;

    const fullLine = () =>
        `<div style="width:100%;border-bottom:1px dotted #555;margin:7px 0;height:12px;"></div>`;

    return `
        <div class="page" style="position: relative; box-sizing: border-box; padding: 15mm 15mm 20mm 15mm; min-height: 297mm; font-family: 'Sarabun', sans-serif;">
            <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 4px;">การติดตามนักเรียน นักศึกษาที่ขาดเรียนบ่อย และนักเรียนที่ออกกลางคัน</div>
            <div style="text-align: center; font-size: 11pt; margin-bottom: 2px;">ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear}</div>
            <div style="text-align: center; font-size: 11pt; margin-bottom: 12px;">
                ระดับชั้น ${advisor?.classLevel || ''} ห้อง ${advisor?.room || ''} สาขาวิชา ${advisor?.department || ''} &mdash; วิทยาลัยอาชีวศึกษาสุโขทัย
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 12px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid black; padding: 4px 2px; background: #f0f0f0; text-align: center; width: 6%;" rowspan="2">ลำดับ</th>
                        <th style="border: 1px solid black; padding: 4px 6px; background: #f0f0f0; text-align: center; width: 34%;" rowspan="2">รายชื่อนักเรียน นักศึกษา</th>
                        <th style="border: 1px solid black; padding: 4px 2px; background: #f0f0f0; text-align: center;" colspan="4">สาเหตุออกกลางคัน</th>
                        <th style="border: 1px solid black; padding: 4px 2px; background: #f0f0f0; text-align: center;" colspan="2">การติดตาม</th>
                    </tr>
                    <tr>
                        <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 8.5pt; width: 10%;">ลาออก</th>
                        <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 8.5pt; width: 10%;">พักการเรียน</th>
                        <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 8.5pt; width: 10%;">พ้นสภาพ</th>
                        <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 8.5pt; width: 14%;">ไม่มาเรียน (มีรายชื่อ)</th>
                        <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 8.5pt; width: 8%;">โทรศัพท์/Line</th>
                        <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 8.5pt; width: 8%;">เยี่ยมบ้าน</th>
                    </tr>
                </thead>
                <tbody>
                    ${filledRows.map((row, i) => `
                        <tr style="height: 24px;">
                            <td style="border: 1px solid black; text-align: center; padding: 2px;">${i + 1}</td>
                            <td style="border: 1px solid black; padding: 2px 6px;">${row?.name || ''}</td>
                            <td style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 11pt;">${checkMark(row?.resign)}</td>
                            <td style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 11pt;">${checkMark(row?.pause)}</td>
                            <td style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 11pt;">${checkMark(row?.expelled)}</td>
                            <td style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 11pt;">${checkMark(row?.absent)}</td>
                            <td style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 11pt;">${checkMark(row?.call)}</td>
                            <td style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 11pt;">${checkMark(row?.visit)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 10px; font-size: 10.5pt; display: flex; align-items: flex-end; gap: 4px;">
                <span style="white-space: nowrap; font-weight: bold;">การติดตาม สาเหตุที่ทำให้นักเรียนนักศึกษาออกกลางคัน:</span>
                <span style="flex: 1; border-bottom: 1px dotted #555; padding-left: 4px; min-height: 20px;">${notes || ''}</span>
            </div>
            ${fullLine()}
            ${fullLine()}

            <div style="margin-top: 30px; display: flex; justify-content: space-around; text-align: center; font-size: 10.5pt;">
                <div>
                    <div>ลงชื่อ ${dotLine('140px')} ครูที่ปรึกษา</div>
                    <div style="margin-top: 6px;">(${advisorSign1 || advisor.name})</div>
                </div>
                <div>
                    <div>ลงชื่อ ${dotLine('140px')} ครูที่ปรึกษา</div>
                    <div style="margin-top: 6px;">(${advisorSign2 || '.......................................'})</div>
                </div>
            </div>

            <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-weight: bold; font-size: 13pt;">
                "เรียนดี มีคุณธรรม"
            </div>
        </div>
    `;
}
