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
            return `
            <div class="page">
                <!-- Header Section - Logo Left, Text Center -->
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <img src="${logoBase64}" alt="Logo" style="width: 80px; height: 80px; margin-right: 15px; flex-shrink: 0;" />
                    <div style="flex: 1; text-align: center; padding-top: 5px;">
                        <h1 style="font-size: 18pt; font-weight: bold; margin: 0; line-height: 1.2;">แบบบันทึกกิจกรรมโฮมรูม ภาคเรียนที่ ${term}/${academicYear}</h1>
                        <p style="font-size: 16pt; margin: 5px 0 0 0;">วิทยาลัยอาชีวศึกษาสุโขทัย</p>
                    </div>
                </div>

                <!-- Class Info - Single Line -->
                <div style="font-size: 14pt; margin-bottom: 5px;">
                    <span style="font-weight: normal;">ระดับชั้น</span> ${advisor.classLevel}
                    &nbsp;&nbsp;&nbsp;
                    <span style="font-weight: normal;">สาขาวิชา</span> ${advisor.department}
                    &nbsp;&nbsp;&nbsp;
                    <span style="font-weight: normal;">ห้อง</span> ${advisor.room}
                </div>
                
                <!-- Advisor Info -->
                <div style="font-size: 14pt; margin-bottom: 15px;">
                    <span style="font-weight: normal;">ครูที่ปรึกษา</span> ${advisor.name}
                </div>

                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; border: 1px solid black;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid black; padding: 8px; font-size: 14pt; font-weight: bold; background-color: #f0f0f0; text-align: center;" rowspan="2">
                                สัปดาห์ที่<br/>วัน/เวลา<br/>สถานที่อบรม
                            </th>
                            <th style="border: 1px solid black; padding: 8px; font-size: 14pt; font-weight: bold; background-color: #f0f0f0; text-align: center;" rowspan="2">
                                เรื่อง/กิจกรรม/แนวทาง/เจ้าหน้าที่
                            </th>
                            <th style="border: 1px solid black; padding: 8px; font-size: 14pt; font-weight: bold; background-color: #f0f0f0; text-align: center;" colspan="3">
                                ข้อมูลนักเรียน/นักศึกษา
                            </th>
                        </tr>
                        <tr>
                            <th style="border: 1px solid black; padding: 4px; font-size: 14pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 60px;">จำนวน</th>
                            <th style="border: 1px solid black; padding: 4px; font-size: 14pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 60px;">มา</th>
                            <th style="border: 1px solid black; padding: 4px; font-size: 14pt; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 60px;">ขาด</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.length > 0 ? reports.map((r: any) => `
                            <tr>
                                <td style="border: 1px solid black; padding: 8px; vertical-align: top; font-size: 12pt;">
                                    <div style="color: #1d4ed8; font-weight: 500;">สัปดาห์ที่ ${r.week} (${r.date})</div>
                                    <div style="color: #666; margin-top: 2px; font-size: 11pt;">เวลา 13.00-14.00 น.</div>
                                </td>
                                <td style="border: 1px solid black; padding: 8px; vertical-align: top; font-size: 12pt; line-height: 1.4;">
                                    ${r.topic}
                                </td>
                                <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 12pt;">${r.totalStudents}</td>
                                <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 12pt;">${r.presentStudents}</td>
                                <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 12pt;">${r.absentStudents}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="border: 1px solid black; padding: 20px; text-align: center; color: #999;">
                                    ไม่พบรายงาน
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
        };

        const getPhotosHTML = () => {
            if (!photos || photos.length === 0) return '';

            let html = '';
            const chunks = [];
            for (let i = 0; i < photos.length; i += 4) {
                chunks.push(photos.slice(i, i + 4));
            }

            chunks.forEach((chunk: string[], pageIndex: number) => {
                html += `
                    <div class="page">
                        <div class="center table-title">ภาพการจัดกิจกรรมโฮมรูม ของครูที่ปรึกษาและนักเรียน นักศึกษา</div>
                        <div class="center table-subtitle">ภาคเรียนที่ ${term}/${academicYear} วิทยาลัยอาชีวศึกษาสุโขทัย</div>
                        ${pageIndex > 0 ? '<div class="center" style="font-size: 20pt; margin-top: 10px;">(ต่อ)</div>' : ''}

                        <div class="photo-grid">
                            ${chunk.map((url, i) => `
                                <div class="photo-item">
                                    <div class="photo-img-box">
                                        <img src="${url}" class="photo-img" />
                                    </div>
                                    <div class="photo-caption">รูปที่ ${(pageIndex * 4) + i + 1}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        const getSummaryHTML = () => `
            <div class="page">
                <div class="center table-title">สรุปราายงานการกิจกรรมโฮมรูม</div>
                <div class="center table-subtitle">ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear || ''}</div>
                <div class="center" style="font-size: 16pt; margin-bottom: 20px;">วิทยาลัยอาชีวศึกษาสุโขทัย</div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%">Date</th>
                            <th style="width: 8%">Week</th>
                            <th style="width: 20%">Advisor</th>
                            <th style="width: 15%">Dept</th>
                            <th style="width: 10%">Class</th>
                            <th style="width: 20%">Topic</th>
                            <th style="width: 10%">Stats</th>
                            <th style="width: 5%">Pic</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.length > 0 ? reports.map((r: any) => `
                            <tr>
                                <td class="center" style="font-size: 12pt">${r.date}</td>
                                <td class="center" style="font-size: 12pt">${r.week}</td>
                                <td style="font-size: 12pt">${r.advisorName}</td>
                                <td style="font-size: 12pt">${r.department}</td>
                                <td class="center" style="font-size: 12pt">${r.classLevel} ${r.room}</td>
                                <td style="font-size: 12pt">${r.topic}</td>
                                <td class="center" style="font-size: 12pt">${r.presentStudents}/${r.totalStudents}</td>
                                <td class="center" style="font-size: 12pt">${r.photoUrl ? 'Yes' : 'No'}</td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="8" class="center">ไม่พบรายงาน</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;

        // --- Assemble HTML ---
        let contentHTML = '';

        if (mode === 'summary') {
            contentHTML = getSummaryHTML();
        } else {
            if (mode === 'all' || mode === 'cover') contentHTML += getCoverHTML();
            if (mode === 'all' || mode === 'table') contentHTML += getTableHTML();
            if ((mode === 'all' || mode === 'photos') && photos && photos.length > 0) contentHTML += getPhotosHTML();
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
