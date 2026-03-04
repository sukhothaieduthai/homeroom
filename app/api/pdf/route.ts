import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { mode, data } = body;
        const { term, academicYear, advisor, reports, photos } = data;

        // --- Logo Loading (Server-Side) ---
        // Fetch logo from public folder and convert to base64
        const fs = require('fs');
        const path = require('path');
        const logoPath = path.join(process.cwd(), 'public', 'sukhothailogo.png');
        let logoBase64 = '';
        try {
            const logoBuffer = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (e) {
            console.error('Failed to load logo:', e);
            // Fallback to placeholder if logo not found
            logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        }

        // --- Font Loading (Server-Side) ---
        // Fetch fonts to embed directly, avoiding "headless" loading issues
        let base64Regular = '';
        let base64Bold = '';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const fontRegularRes = await fetch('https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf', {
                signal: controller.signal
            });
            const fontBoldRes = await fetch('https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const fontRegularParams = await fontRegularRes.arrayBuffer();
            const fontBoldParams = await fontBoldRes.arrayBuffer();

            base64Regular = Buffer.from(fontRegularParams).toString('base64');
            base64Bold = Buffer.from(fontBoldParams).toString('base64');
        } catch (e) {
            console.error('Failed to load fonts, PDF will use fallback fonts:', e);
            // Leave base64Regular and base64Bold as empty strings
            // PDF will fallback to browser default fonts
        }

        // --- HTML Construction Helpers ---

        const getHead = () => `
            <head>
                <style>
                    /* Embed Fonts */
                    ${base64Regular ? `
                    @font-face {
                        font-family: 'Sarabun';
                        src: url(data:font/ttf;base64,${base64Regular}) format('truetype');
                        font-weight: 400;
                        font-style: normal;
                    }
                    ` : ''}
                    ${base64Bold ? `
                    @font-face {
                        font-family: 'Sarabun';
                        src: url(data:font/ttf;base64,${base64Bold}) format('truetype');
                        font-weight: 700;
                        font-style: normal;
                    }
                    ` : ''}

                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        font-family: 'Sarabun', sans-serif;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    .page {
                        width: 210mm;
                        height: 296mm; /* slightly less than 297 to avoid overflow page break */
                        position: relative;
                        page-break-after: always;
                        overflow: hidden;
                        padding: 20mm;
                        box-sizing: border-box;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    
                    /* Cover Styles */
                    .cover-title { font-size: 28pt; font-weight: bold; margin-top: 40px; }
                    .cover-subtitle { font-size: 24pt; font-weight: bold; margin-top: 15px; }
                    .cover-label { font-size: 20pt; margin-top: 60px; }
                    .cover-name { font-size: 32pt; font-weight: bold; margin-top: 30px; color: #000; }
                    .cover-info { font-size: 24pt; margin-top: 30px; }
                    .cover-dept { font-size: 24pt; margin-top: 15px; }
                    .cover-footer { 
                        font-size: 20pt; 
                        position: absolute; 
                        bottom: 40mm; 
                        width: 100%; 
                        left: 0;
                        text-align: center;
                        line-height: 1.5;
                    }

                    /* Table Styles */
                    .table-title { font-size: 24pt; font-weight: bold; margin-top: 10px; }
                    .table-subtitle { font-size: 22pt; margin-top: 5px; }
                    .header-info { 
                        font-size: 20pt; 
                        margin-top: 20px; 
                        margin-bottom: 20px;
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 16pt;
                    }
                    th, td {
                        border: 1px solid black;
                        padding: 8px;
                        vertical-align: top;
                    }
                    th {
                        background-color: #f0f0f0;
                        text-align: center;
                        font-weight: bold;
                    }
                    .col-center { text-align: center; }

                    /* Photo Styles */
                    .photo-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-top: 30px;
                    }
                    .photo-item {
                        display: flex;
                        flex-col: column;
                        align-items: center;
                    }
                    .photo-img-box {
                        width: 320px; 
                        height: 240px;
                        border: 1px solid #000;
                        overflow: hidden;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .photo-img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .photo-caption {
                        margin-top: 10px;
                        font-size: 16pt;
                        text-align: center;
                    }
                </style>
            </head>
        `;

        const getCoverHTML = () => `
            <div class="page">
                <div class="center cover-title">รายงานการบันทึกกิจกรรมโฮมรูม (HOME ROOM)</div>
                <div class="center cover-subtitle">ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear}</div>
                
                <div class="center cover-label">จัดทำโดย</div>
                <div class="center cover-name">${advisor.name}</div>
                
                <div class="center cover-info">
                    ครูที่ปรึกษา ระดับชั้น/ปีที่ <span class="bold">${advisor.classLevel}</span> ห้อง <span class="bold">${advisor.room}</span>
                </div>
                <div class="center cover-dept">สาขาวิชา ${advisor.department}</div>

                <div class="cover-footer">
                    <div>วิทยาลัยอาชีวศึกษาสุโขทัย สถาบันการอาชีวศึกษาภาคเหนือ 3</div>
                    <div>สำนักงานอาชีวศึกษาจังหวัดสุโขทัย</div>
                    <div>สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ</div>
                </div>
            </div>
        `;

        const getTableHTML = () => {
            if (!reports || reports.length === 0) {
                // Empty state if no reports (still render the page structure)
                return `
                <div class="page">
                    <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px; position: relative;">
                        <img src="${logoBase64}" alt="Logo" style="width: 80px; height: 80px; position: absolute; left: 0; top: 0;" />
                        <div style="text-align: center; width: 100%;">
                            <h1 style="font-size: 18pt; font-weight: bold; margin: 0; line-height: 1.2;">แบบบันทึกกิจกรรมโฮมรูม ภาคเรียนที่ ${term}/${academicYear}</h1>
                            <h2 style="font-size: 18pt; font-weight: bold; margin: 5px 0 0 0;">วิทยาลัยอาชีวศึกษาสุโขทัย</h2>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 100px; color: #999; font-size: 16pt;">ไม่พบรายงาน</div>
                </div>`;
            }

            let html = '';
            const chunks = [];
            for (let i = 0; i < reports.length; i += 6) {
                chunks.push(reports.slice(i, i + 6));
            }

            chunks.forEach((chunk: any[], pageIndex: number) => {
                const isLastPage = pageIndex === chunks.length - 1;

                html += `
                <div class="page" style="display: flex; flex-direction: column;">
                    <!-- Header Section -->
                    <div style="display: flex; align-items: flex-start; margin-bottom: 5px;">
                        <img src="${logoBase64}" alt="Logo" style="width: 60px; height: 60px; margin-right: 15px; flex-shrink: 0;" />
                        <div style="flex: 1; text-align: center; padding-top: 5px;">
                            <h1 style="font-size: 16pt; font-weight: bold; margin: 0; line-height: 1.2;">แบบบันทึกกิจกรรมโฮมรูม ภาคเรียนที่ ${term}/${academicYear}</h1>
                            <p style="font-size: 14pt; margin: 2px 0 0 0;">วิทยาลัยอาชีวศึกษาสุโขทัย</p>
                        </div>
                    </div>

                    <!-- Class & Advisor Info -->
                    <div style="font-size: 12pt; margin-bottom: 2px;">
                        <span style="font-weight: normal;">ระดับชั้น</span> ${advisor.classLevel}
                        &nbsp;&nbsp;&nbsp;
                        <span style="font-weight: normal;">สาขาวิชา</span> ${advisor.department}
                        &nbsp;&nbsp;&nbsp;
                        <span style="font-weight: normal;">ห้อง</span> ${advisor.room}
                    </div>
                    
                    <div style="font-size: 12pt; margin-bottom: 8px;">
                        <span style="font-weight: normal;">ครูที่ปรึกษา</span> ${advisor.name}
                    </div>

                    <!-- Table -->
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 8px; flex: 1;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid black; padding: 4px; font-size: 12pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 22%;" rowspan="2">
                                    สัปดาห์ที่<br/>วัน/เวลา<br/>สถานที่อบรม
                                </th>
                                <th style="border: 1px solid black; padding: 4px; font-size: 12pt; font-weight: bold; background-color: #f0f0f0; text-align: center;" rowspan="2">
                                    เรื่อง/กิจกรรม/แนวทาง/เจ้าหน้าที่
                                </th>
                                <th style="border: 1px solid black; padding: 4px; font-size: 12pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 28%;" colspan="3">
                                    ข้อมูลนักเรียน/นักศึกษา
                                </th>
                            </tr>
                            <tr>
                                <th style="border: 1px solid black; padding: 2px; font-size: 11pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 8%;">จำนวน</th>
                                <th style="border: 1px solid black; padding: 2px; font-size: 11pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 8%;">มา</th>
                                <th style="border: 1px solid black; padding: 2px; font-size: 11pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 8%;">ขาด</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${chunk.map((r: any) => `
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px; vertical-align: top; font-size: 11pt;">
                                        <div style="color: #1d4ed8; font-weight: 500;">สัปดาห์ที่ ${r.week} (${r.date})</div>
                                        <div style="color: #666; margin-top: 1px; font-size: 10pt;">เวลา 13.00-14.00 น.</div>
                                    </td>
                                    <td style="border: 1px solid black; padding: 4px; vertical-align: top; font-size: 11pt; line-height: 1.3;">
                                        ${r.topic}
                                    </td>
                                    <td style="border: 1px solid black; padding: 2px; text-align: center; font-size: 11pt; vertical-align: middle;">${r.totalStudents}</td>
                                    <td style="border: 1px solid black; padding: 2px; text-align: center; font-size: 11pt; vertical-align: middle;">${r.presentStudents}</td>
                                    <td style="border: 1px solid black; padding: 2px; text-align: center; font-size: 11pt; vertical-align: middle;">${r.absentStudents}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Footer Details (Display on every page) -->
                    <div style="font-size: 11pt; line-height: 1.4; margin-top: auto; padding-top: 5px;">
                        
                        <!-- Stats Rows -->
                        <div style="font-size: 10pt; display: flex; justify-content: space-between; align-items: center; padding: 0 5px; width: 100%; white-space: nowrap; overflow: hidden;">
                            <span>จำนวนนักเรียนนักศึกษาขอรับคำปรึกษา (ตามแบบบันทึก).......................คน </span>
                            <span>ช่วยเหลือเรียบร้อย.......................คน</span>
                        </div>
                        
                        <div style="font-size: 10pt; display: flex; justify-content: space-between; align-items: center; margin-top: 5px; margin-bottom: 15px; width: 100%; white-space: nowrap; overflow: hidden;">
                            <span>มีการส่งต่อ.......................คน</span>
                            <span>จำนวนนักเรียนนักศึกษาออกกลางคัน (ถ้ามี) ลาออก.......................คน</span>
                            <span>พักการเรียน.......................คน</span>
                            <span>อื่นๆ (.........................................)....... คน</span>
                        </div>

                        <!-- Signatures -->
                        <div style="display: flex; justify-content: space-around; margin-top: 10px; margin-bottom: 10px;">
                            <div style="text-align: center;">
                                <div style="display: flex; align-items: flex-end;">
                                    <span style="margin-right: 10px;">ลงชื่อ</span>
                                    <div style="border-bottom: 1px dotted black; width: 140px;"></div>
                                    <span style="margin-left: 10px;">ครูที่ปรึกษา</span>
                                </div>
                                <div style="margin-top: 5px;">(${advisor.name})</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="display: flex; align-items: flex-end;">
                                    <span style="margin-right: 10px;">ลงชื่อ</span>
                                    <div style="border-bottom: 1px dotted black; width: 140px;"></div>
                                    <span style="margin-left: 10px;">ครูที่ปรึกษา</span>
                                </div>
                                <div style="margin-top: 5px;">(............................................................)</div>
                            </div>
                        </div>

                        <!-- Remarks -->
                        <div style="display: flex; align-items: flex-start; margin-top: 8px; padding: 0 5px;">
                            <span style="font-weight: bold; margin-right: 10px; white-space: nowrap;">หมายเหตุ</span>
                            <div style="flex: 1; white-space: pre-wrap; line-height: 1.2;">${data.remarks || ''}</div>
                        </div>
                    </div>
                </div>
                `;
            });

            return html;
        };

        const getPhotosHTML = () => {
            if (!photos || photos.length === 0) return '';

            let html = '';
            const chunks = [];
            // Changed from 4 to 6 photos per page
            for (let i = 0; i < photos.length; i += 6) {
                chunks.push(photos.slice(i, i + 6));
            }

            chunks.forEach((chunk: string[], pageIndex: number) => {
                html += `
                    <div class="page">
                        <div class="center table-title">ภาพการจัดกิจกรรมโฮมรูม ของครู${advisor.name} และนักเรียน นักศึกษา</div>
                        <div class="center table-subtitle">ภาคเรียนที่ ${term}/${academicYear} วิทยาลัยอาชีวศึกษาสุโขทัย</div>
                        ${pageIndex > 0 ? '<div class="center" style="font-size: 20pt; margin-top: 10px;">(ต่อ)</div>' : ''}

                        <div class="photo-grid" style="flex-grow: 1;">
                            ${chunk.map((url, i) => `
                                <div class="photo-item">
                                    <div class="photo-img-box">
                                        <img src="${url}" class="photo-img" />
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Footer Motto -->
                        <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 16pt; font-weight: bold; color: #333;">
                            “เรียนดี มีคุณธรรม”
                        </div>
                    </div>
                `;
            });
            return html;
        };

        // Helper utilities for form lines
        const dotLine = (width = '130px') => `<div style="border-bottom: 1px dotted black; width: ${width}; display: inline-block; margin-bottom: 2px;"></div>`;
        const fullLine = () => `<div style="border-bottom: 1px solid #aaa; width: 100%; margin-bottom: 8px; height: 16px;"></div>`;
        const emptyRows = (n: number, cols: number) => Array.from({ length: n }).map((_, i) => `
            <tr style="height: 28px;">
                <td style="border: 1px solid black; padding: 2px; text-align: center; font-size: 10pt;">${i + 1}</td>
                ${'<td style="border: 1px solid black; padding: 2px;"></td>'.repeat(cols - 1)}
            </tr>`).join('');

        // --- NEW FORM 1: แบบบันทึกให้คำปรึกษา (รายบุคคล) ---
        const getCounselingFormHTML = () => `
            <div class="page" style="font-size: 12pt;">
                <div style="text-align: center; font-weight: bold; margin-bottom: 12px;">แบบบันทึกให้คำปรึกษานักเรียน นักศึกษา (รายบุคคล)</div>

                <div style="text-align: right; margin-bottom: 8px;">วันที่............เดือน.......................พ.ศ........................</div>

                <div style="margin-bottom: 6px;">เริ่มเวลา.........................................................................</div>
                <div style="font-weight: bold; margin-bottom: 4px;">ผู้ขอรับการปรึกษา</div>
                <div style="margin-bottom: 4px;">ชื่อ................................สกุล...................................ชื่อเล่น..........................</div>
                <div style="margin-bottom: 12px;">ระดับชั้น..............ปีที่.........ห้อง..........เบอร์โทรศัพท์........................................</div>

                <div style="font-weight: bold; margin-bottom: 4px;">การพิจารณารับคำปรึกษา</div>
                <div style="margin-bottom: 4px; font-size: 11pt;">
                    &#9744; สังเกตเห็นและเข้าไปช่วยเหลือเอง &nbsp;&nbsp; &#9744; ผู้รับการปรึกษามาด้วยตนเอง &nbsp;&nbsp; &#9744; ส่งต่อมาจาก..............
                </div>
                <div style="margin-bottom: 12px; font-size: 11pt;">
                    &#9744; การพิจารณารับคำปรึกษาครั้งที่...... &nbsp;&nbsp; &#9744; เป็นครั้งแรก &nbsp;&nbsp; &#9744; ต่อเนื่องเป็นครั้งที่......
                </div>

                <div style="font-weight: bold; margin-bottom: 4px;">กรณีการให้คำปรึกษา</div>
                <table style="width: 100%; font-size: 11pt; margin-bottom: 14px;">
                    <tr>
                        <td>&#9744; การเรียน</td>
                        <td>&#9744; เพื่อน</td>
                        <td>&#9744; ครอบครัว</td>
                        <td>&#9744; สุขภาพ</td>
                    </tr>
                    <tr>
                        <td>&#9744; การศึกษาต่อ</td>
                        <td>&#9744; ความรัก</td>
                        <td>&#9744; เศรษฐกิจ</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>&#9744; อาชีพ/ทางงานพิเศษ</td>
                        <td>&#9744; อื่นๆ</td>
                        <td></td>
                        <td></td>
                    </tr>
                </table>

                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">ปัญหา/สาเหตุการขอรับการให้คำปรึกษา</div>
                ${fullLine()}${fullLine()}${fullLine()}

                <div style="font-weight: bold; text-decoration: underline; margin-top: 10px; margin-bottom: 4px;">การให้คำปรึกษา/แนะนำ/การช่วยเหลือ</div>
                ${fullLine()}${fullLine()}${fullLine()}

                <div style="font-weight: bold; text-decoration: underline; margin-top: 10px; margin-bottom: 4px;">ผลสรุปของการแก้ปัญหา</div>
                ${fullLine()}${fullLine()}

                <div style="margin-top: 10px; margin-bottom: 4px;">วางแผน/การนัดหมายครั้งต่อไป วันที่...................................เวลา.........................</div>
                <div style="margin-bottom: 6px;">การติดตามผล</div>
                ${fullLine()}

                <div style="margin-top: 10px; margin-bottom: 6px;">การส่งต่อ (ถ้ามี)</div>
                ${fullLine()}

                <div style="margin-top: 20px; text-align: center;">
                    ลงชื่อ ${dotLine('120px')} ผู้รับคำปรึกษา &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ลงชื่อ ${dotLine('120px')} ผู้ให้คำปรึกษา<br/>
                    <span style="margin-right: 140px; display: inline-block; margin-top: 6px;">(.......................................)</span>
                    <span style="display: inline-block; margin-top: 6px;">(.......................................)</span>
                </div>
                <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-weight: bold; font-size: 14pt;">"เรียนดี มีคุณธรรม"</div>
            </div>
        `;

        // --- NEW FORM 2: รายงานการให้คำปรึกษา (ตาราง) ---
        const getCounselingTableHTML = () => `
            <div class="page">
                <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 4px;">รายงานการให้คำปรึกษานักเรียนนักศึกษา วิทยาลัยอาชีวศึกษาสุโขทัย</div>
                <div style="text-align: center; font-size: 12pt; margin-bottom: 4px;">แนวทางการดูแลช่วยเหลือผู้เรียน ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear}</div>
                <div style="font-size: 12pt; margin-bottom: 12px;">ระดับชั้น ${advisor?.classLevel || ''} ห้อง ${advisor?.room || ''} สาขาวิชา ${advisor?.department || ''}</div>

                <table style="width: 100%; border-collapse: collapse; font-size: 11pt;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid black; padding: 4px; background: #f0f0f0; text-align: center; width: 6%;">ลำดับ</th>
                            <th style="border: 1px solid black; padding: 4px; background: #f0f0f0; text-align: center; width: 25%;">ผู้รับคำปรึกษา</th>
                            <th style="border: 1px solid black; padding: 4px; background: #f0f0f0; text-align: center; width: 35%;">เรื่องที่ขอรับการปรึกษา</th>
                            <th style="border: 1px solid black; padding: 4px; background: #f0f0f0; text-align: center; width: 12%;">แก้ปัญหาสำเร็จ</th>
                            <th style="border: 1px solid black; padding: 4px; background: #f0f0f0; text-align: center; width: 12%;">มีการส่งต่อ</th>
                            <th style="border: 1px solid black; padding: 4px; background: #f0f0f0; text-align: center; width: 10%;">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${emptyRows(14, 6)}
                    </tbody>
                </table>

                <div style="margin-top: 24px; display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <div>ลงชื่อ ${dotLine('120px')} ครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(${advisor.name})</div>
                    </div>
                    <div>
                        <div>ลงชื่อ ${dotLine('120px')} ครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(.......................................)</div>
                    </div>
                </div>
                <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-weight: bold; font-size: 14pt;">"เรียนดี มีคุณธรรม"</div>
            </div>
        `;

        // --- NEW FORM 3: การติดตามนักเรียน ---
        const getStudentTrackingHTML = () => `
            <div class="page">
                <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 12px;">การติดตามนักเรียน นักศึกษาที่ขาดเรียนบ่อย และนักเรียนที่ออกกลางคัน</div>

                <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid black; padding: 3px; background: #f0f0f0; text-align: center; width: 5%;" rowspan="2">ลำดับ</th>
                            <th style="border: 1px solid black; padding: 3px; background: #f0f0f0; text-align: center; width: 22%;" rowspan="2">รายชื่อนักเรียน นักศึกษา</th>
                            <th style="border: 1px solid black; padding: 3px; background: #f0f0f0; text-align: center;" colspan="4">สาเหตุออกกลางคัน</th>
                            <th style="border: 1px solid black; padding: 3px; background: #f0f0f0; text-align: center;" colspan="2">การติดตาม</th>
                        </tr>
                        <tr>
                            <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 9pt;">ลาออก</th>
                            <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 9pt;">พักการเรียน</th>
                            <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 9pt;">พ้นสภาพ</th>
                            <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 9pt;">ไม่มาเรียน (มีรายชื่อ)</th>
                            <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 9pt;">โทรศัพท์/Line</th>
                            <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; text-align: center; font-size: 9pt;">เยี่ยมบ้าน</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${emptyRows(13, 8)}
                    </tbody>
                </table>

                <div style="margin-top: 8px; font-size: 11pt;">การติดตาม สาเหตุที่ทำให้นักเรียนนักศึกษาออกกลางคัน.....................................................................................</div>
                ${fullLine()}${fullLine()}

                <div style="margin-top: 24px; display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <div>ลงชื่อ ${dotLine('120px')} ครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(${advisor.name})</div>
                    </div>
                    <div>
                        <div>ลงชื่อ ${dotLine('120px')} ครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(.......................................)</div>
                    </div>
                </div>
                <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-weight: bold; font-size: 14pt;">"เรียนดี มีคุณธรรม"</div>
            </div>
        `;

        // --- NEW FORM 4: สรุปปัญหา/ข้อเสนอแนะ ---
        const getSummaryFormHTML = () => `
            <div class="page">
                <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 4px;">สรุปปัญหาของนักเรียน และข้อเสนอแนะในการจัดกิจกรรมโฮมรูม</div>
                <div style="text-align: center; font-size: 12pt; margin-bottom: 2px;">ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear}</div>
                <div style="text-align: center; font-size: 12pt; margin-bottom: 2px;">ระดับชั้น ${advisor?.classLevel || ''} ห้อง ${advisor?.room || ''} สาขาวิชา ${advisor?.department || ''}</div>
                <div style="text-align: center; font-size: 12pt; margin-bottom: 14px;">วิทยาลัยอาชีวศึกษาสุโขทัย</div>

                <div style="font-size: 12pt; font-weight: bold; margin-bottom: 6px;">1. ปัญหาของนักเรียน ในการจัดกิจกรรม</div>
                ${fullLine()}${fullLine()}${fullLine()}${fullLine()}

                <div style="font-size: 12pt; font-weight: bold; margin-top: 12px; margin-bottom: 6px;">2. แนวทางการแก้ไขปัญหาของครูที่ปรึกษา</div>
                ${fullLine()}${fullLine()}${fullLine()}${fullLine()}

                <div style="font-size: 12pt; font-weight: bold; margin-top: 12px; margin-bottom: 6px;">3. ข้อเสนอแนะ</div>
                ${fullLine()}${fullLine()}${fullLine()}${fullLine()}${fullLine()}

                <div style="margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center;">
                    <div>
                        <div>ลงชื่อ ${dotLine('110px')} ครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(${advisor.name})</div>
                    </div>
                    <div>
                        <div>ลงชื่อ ${dotLine('110px')} ครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(.......................................)</div>
                    </div>
                    <div style="margin-top: 12px;">
                        <div>ลงชื่อ ${dotLine('110px')} หัวหน้าแผนกวิชา</div>
                        <div style="margin-top: 6px;">(.......................................)</div>
                    </div>
                    <div style="margin-top: 12px;">
                        <div>ลงชื่อ ${dotLine('110px')} หัวหน้างานครูที่ปรึกษา</div>
                        <div style="margin-top: 6px;">(.......................................)</div>
                    </div>
                </div>
                <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-weight: bold; font-size: 14pt;">"เรียนดี มีคุณธรรม"</div>
            </div>
        `;

        // --- Assemble HTML ---
        let contentHTML = '';

        if (mode === 'cover') contentHTML = getCoverHTML();
        else if (mode === 'table') contentHTML = getTableHTML();
        else if (mode === 'photos' && photos && photos.length > 0) contentHTML = getPhotosHTML();
        else if (mode === 'counseling-form') contentHTML = getCounselingFormHTML();
        else if (mode === 'counseling-table') contentHTML = getCounselingTableHTML();
        else if (mode === 'student-tracking') contentHTML = getStudentTrackingHTML();
        else if (mode === 'summary-form') contentHTML = getSummaryFormHTML();
        else {
            // fallback: full report
            contentHTML += getCoverHTML();
            contentHTML += getTableHTML();
            if (photos && photos.length > 0) contentHTML += getPhotosHTML();
        }

        const fullHTML = `
            <!DOCTYPE html>
            <html>
                ${getHead()}
                <body>
                    ${contentHTML}
                </body>
            </html>
        `;

        // --- Puppeteer Launch Logic ---
        let browser;

        if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
            // Vercel / Production: Use puppeteer-core + @sparticuz/chromium
            const chromium = require('@sparticuz/chromium');
            const puppeteerCore = require('puppeteer-core');

            browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
        } else {
            // Local Development: Use full puppeteer
            const puppeteer = require('puppeteer'); // Dynamically require puppeteer
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }

        const page = await browser.newPage();

        // Optimize: set HTML content
        await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 } // handled by CSS .page padding
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=homeroom-report.pdf`,
            },
        });

    } catch (error) {
        console.error("PDF Gen Error:", error);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
