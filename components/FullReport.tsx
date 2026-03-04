"use client";

import { useState, useEffect } from "react";
import { HomeroomReport, Advisor } from "@/lib/google-sheets";
import { getReportsAction } from "@/app/actions";
import AdvisorSelector from "./AdvisorSelector";
import { DownloadIcon, FileTextIcon, TableIcon, ImageIcon, ClipboardListIcon, UsersIcon, BookOpenIcon } from "lucide-react";
import { convertToDriveDirectUrl } from "@/lib/drive-utils";

type ViewMode = "cover" | "table" | "photos" | "counseling-form" | "counseling-table" | "student-tracking" | "summary-form";

export default function FullReport() {
    // Selectors State
    const currentYearAD = new Date().getFullYear();
    const currentYearBE = currentYearAD + 543;
    const years = [currentYearBE - 1, currentYearBE, currentYearBE + 1, currentYearBE + 2, currentYearBE + 3];

    const [term, setTerm] = useState("2");
    const [academicYear, setAcademicYear] = useState(String(currentYearBE));
    const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);

    // Data State
    const [allReports, setAllReports] = useState<HomeroomReport[]>([]);
    const [filteredReports, setFilteredReports] = useState<HomeroomReport[]>([]);
    const [reportPhotos, setReportPhotos] = useState<string[]>([]);
    const [reportRemarks, setReportRemarks] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>("cover");

    useEffect(() => {
        async function fetchReports() {
            const data = await getReportsAction();
            setAllReports(data);
        }
        fetchReports();
    }, []);

    // Filter reports when selectors change
    useEffect(() => {
        if (!selectedAdvisor) {
            setFilteredReports([]);
            setReportPhotos([]);
            return;
        }

        const rigorousFiltered = allReports.filter(r =>
            (r.academicYear === academicYear || !r.academicYear) &&
            (r.term === term || !r.term) &&
            r.advisorName?.includes(selectedAdvisor.name)
        );
        setFilteredReports(rigorousFiltered);

        // Extract photos and convert to direct URLs
        const photos: string[] = [];
        rigorousFiltered.forEach(r => {
            if (r.photoUrl) {
                r.photoUrl.split(',').forEach(url => {
                    const trimmedUrl = url.trim();
                    if (trimmedUrl) {
                        photos.push(convertToDriveDirectUrl(trimmedUrl));
                    }
                });
            }
        });
        setReportPhotos(photos);

    }, [allReports, term, academicYear, selectedAdvisor]);

    const handleAdvisorSelect = (advisors: Advisor[]) => {
        if (advisors.length > 0) {
            setSelectedAdvisor(advisors[0]);
        } else {
            setSelectedAdvisor(null);
        }
    };

    const handleExport = async () => {
        if (!selectedAdvisor) return alert("กรุณาเลือกครูที่ปรึกษา");

        setIsGenerating(true);
        try {
            let photosToSend: string[] = [];
            if (viewMode === 'photos') {
                if (reportPhotos.length === 0) {
                    alert("ไม่พบรูปภาพ");
                    setIsGenerating(false);
                    return;
                }
                photosToSend = reportPhotos;
            }

            const payload = {
                mode: viewMode,
                data: {
                    term,
                    academicYear,
                    advisor: selectedAdvisor,
                    reports: filteredReports,
                    photos: photosToSend,
                    remarks: reportRemarks
                }
            };

            const response = await fetch('/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to generate PDF");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `homeroom-${viewMode}-${selectedAdvisor.name}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Export failed", error);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF (Server-Side)");
        } finally {
            setIsGenerating(false);
        }
    };

    // Pagination Logic for Table (6 items per page)
    const tableChunks: HomeroomReport[][] = [];
    if (filteredReports.length > 0) {
        for (let i = 0; i < filteredReports.length; i += 6) {
            tableChunks.push(filteredReports.slice(i, i + 6));
        }
    } else {
        tableChunks.push([]);
    }

    const tabButtons: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
        { mode: "cover", icon: <FileTextIcon size={18} />, label: "หน้าปก" },
        { mode: "table", icon: <TableIcon size={18} />, label: "ตาราง" },
        { mode: "photos", icon: <ImageIcon size={18} />, label: "รูปภาพ" },
        { mode: "counseling-form", icon: <ClipboardListIcon size={18} />, label: "แบบบันทึกให้คำปรึกษา" },
        { mode: "counseling-table", icon: <BookOpenIcon size={18} />, label: "รายงานให้คำปรึกษา (ตาราง)" },
        { mode: "student-tracking", icon: <UsersIcon size={18} />, label: "ติดตามนักเรียน" },
        { mode: "summary-form", icon: <FileTextIcon size={18} />, label: "สรุปปัญหา/ข้อเสนอแนะ" },
    ];

    const dotLine = (width: string = "w-40") => (
        <div className={`border-b border-dotted border-black ${width} mb-1`}></div>
    );

    const fullLine = () => (
        <div className="border-b border-black w-full my-1"></div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">ระบบพิมพ์รายงาน (Print)</h2>

            {/* Advisor Selector */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <AdvisorSelector year={Number(academicYear)} onAdvisorSelect={handleAdvisorSelect} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">ภาคเรียนที่</label>
                        <select
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            className="border border-gray-300 p-2 rounded-md h-10 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">ปีการศึกษา</label>
                        <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="border border-gray-300 p-2 rounded-md h-10 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Remarks for Table mode */}
            {selectedAdvisor && viewMode === 'table' && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col gap-2 shadow-sm">
                    <label className="text-sm font-medium text-gray-700">หมายเหตุ (แสดงท้ายตารางรายงาน)</label>
                    <textarea
                        value={reportRemarks}
                        onChange={(e) => setReportRemarks(e.target.value)}
                        placeholder="พิมพ์หมายเหตุเพิ่มเติมตรงนี้ เช่น วันหยุดต่างๆ..."
                        className="border border-gray-300 p-2 rounded-md w-full min-h-[80px] text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                    />
                </div>
            )}

            {/* Download Button */}
            {selectedAdvisor && (
                <div className="flex justify-end">
                    <button
                        onClick={handleExport}
                        disabled={isGenerating || (viewMode !== 'counseling-form' && viewMode !== 'counseling-table' && viewMode !== 'student-tracking' && viewMode !== 'summary-form' && filteredReports.length === 0)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all font-semibold shadow-md"
                    >
                        <DownloadIcon size={20} />
                        {isGenerating ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
                    </button>
                </div>
            )}

            {/* View Mode Tabs */}
            <div className="flex gap-2 w-full overflow-x-auto pb-2">
                {tabButtons.map(({ mode, icon, label }) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-bold transition-all border text-sm ${viewMode === mode
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        {icon} {label}
                    </button>
                ))}
            </div>

            {/* View Content */}
            <div className="bg-white border text-gray-900 border-gray-200 shadow-sm rounded-lg min-h-[500px] p-4 sm:p-8 bg-gray-50 overflow-auto">
                <div className="w-max mx-auto flex flex-col gap-8">
                    {!selectedAdvisor ? (
                        <div className="text-gray-400 flex flex-col items-center justify-center h-64 w-[210mm] shrink-0 border border-gray-200 bg-white shadow-lg mx-auto">
                            <p>กรุณาเลือก ครูที่ปรึกษา เพื่อแสดงรายงาน</p>
                        </div>
                    ) : (
                        <>
                            {/* ===== EXISTING: COVER ===== */}
                            {viewMode === "cover" && (
                                <div className="w-[210mm] shrink-0 border border-gray-300 p-12 bg-white shadow-lg relative min-h-[297mm]">
                                    <div className="flex flex-col items-center justify-between h-full text-center min-h-[250mm]">
                                        <div className="space-y-6 mt-10">
                                            <h1 className="text-3xl font-bold font-serif">รายงานการบันทึกกิจกรรมโฮมรูม (HOME ROOM)</h1>
                                            <h2 className="text-2xl font-semibold font-serif">ภาคเรียนที่ {term} ปีการศึกษา {academicYear}</h2>
                                            <div className="py-12">
                                                <h3 className="text-xl font-medium">จัดทำโดย</h3>
                                                <div className="mt-8 space-y-4">
                                                    <h2 className="text-3xl font-bold text-blue-900">{selectedAdvisor.name}</h2>
                                                    <p className="text-xl">ครูที่ปรึกษา ระดับชั้น/ปีที่ <span className="font-bold">{selectedAdvisor.classLevel}</span> ห้อง <span className="font-bold">{selectedAdvisor.room}</span></p>
                                                    <p className="text-xl">สาขาวิชา {selectedAdvisor.department}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-base text-gray-600 mb-10 w-full absolute bottom-10 left-0 right-0">
                                            <p className="font-semibold text-lg">วิทยาลัยอาชีวศึกษาสุโขทัย สถาบันการอาชีวศึกษาภาคเหนือ 3</p>
                                            <p>สำนักงานอาชีวศึกษาจังหวัดสุโขทัย</p>
                                            <p>สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== EXISTING: TABLE ===== */}
                            {viewMode === "table" && (
                                <>
                                    {tableChunks.map((chunk, pageIndex) => (
                                        <div key={pageIndex} className="w-[210mm] shrink-0 border border-gray-300 p-12 bg-white shadow-lg flex flex-col min-h-[297mm]">
                                            <div className="flex-1 flex flex-col">
                                                <div className="flex items-start mb-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src="/sukhothailogo.png" alt="Logo" className="w-16 h-16 mr-4 flex-shrink-0" />
                                                    <div className="flex-1 text-center pt-1 mt-1">
                                                        <h1 className="text-sm font-bold leading-tight">แบบบันทึกกิจกรรมโฮมรูม ภาคเรียนที่ {term}/{academicYear}</h1>
                                                        <p className="text-xs mt-0.5">วิทยาลัยอาชีวศึกษาสุโขทัย</p>
                                                    </div>
                                                </div>
                                                <div className="text-[11px] mb-1">
                                                    <span>ระดับชั้น</span> {selectedAdvisor.classLevel}{'   '}
                                                    <span>สาขาวิชา</span> {selectedAdvisor.department}{'   '}
                                                    <span>ห้อง</span> {selectedAdvisor.room}
                                                </div>
                                                <div className="text-[11px] mb-2">
                                                    <span>ครูที่ปรึกษา</span> {selectedAdvisor.name}
                                                </div>
                                                <table className="w-full border-collapse border border-black mb-4 flex-1">
                                                    <thead>
                                                        <tr>
                                                            <th className="border border-black p-1.5 text-[11px] font-medium bg-gray-100 w-[20%]" rowSpan={2}>สัปดาห์ที่<br />วัน/เวลา<br />สถานที่อบรม</th>
                                                            <th className="border border-black p-1.5 text-[11px] font-medium bg-gray-100 w-[50%]" rowSpan={2}>เรื่อง/กิจกรรม/แนวทาง/เจ้าหน้าที่</th>
                                                            <th className="border border-black p-1.5 text-[11px] font-medium bg-gray-100" colSpan={3}>ข้อมูลนักเรียน/นักศึกษา</th>
                                                        </tr>
                                                        <tr>
                                                            <th className="border border-black p-1 text-[10px] font-medium bg-gray-100 w-[10%]">จำนวน</th>
                                                            <th className="border border-black p-1 text-[10px] font-medium bg-gray-100 w-[10%]">มา</th>
                                                            <th className="border border-black p-1 text-[10px] font-medium bg-gray-100 w-[10%]">ขาด</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {chunk.length > 0 ? chunk.map((r) => (
                                                            <tr key={r.id}>
                                                                <td className="border border-black p-1.5 align-top text-[10px]">
                                                                    <div className="text-blue-700 font-medium">สัปดาห์ที่ {r.week} ({r.date})</div>
                                                                    <div className="text-gray-600 mt-0.5">เวลา 13.00-14.00 น.</div>
                                                                </td>
                                                                <td className="border border-black p-1.5 align-top text-[10px] leading-relaxed">{r.topic}</td>
                                                                <td className="border border-black p-1 text-center text-[10px]">{r.totalStudents}</td>
                                                                <td className="border border-black p-1 text-center text-[10px]">{r.presentStudents}</td>
                                                                <td className="border border-black p-1 text-center text-[10px]">{r.absentStudents}</td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={5} className="border border-black p-4 text-center text-gray-500 text-[10px]">ไม่พบรายงาน</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="text-[10px] mt-2">
                                                <div className="flex justify-between items-center mb-2 px-1 w-full overflow-hidden">
                                                    <span className="whitespace-nowrap flex-shrink min-w-0 pr-2">จำนวนนักเรียนนักศึกษาขอรับคำปรึกษา (ตามแบบบันทึก).......................คน </span>
                                                    <span className="whitespace-nowrap flex-shrink-0">ช่วยเหลือเรียบร้อย.......................คน</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-x-1 mb-4 w-full overflow-hidden tracking-tighter">
                                                    <span className="whitespace-nowrap flex-shrink min-w-0">มีการส่งต่อ.......................คน</span>
                                                    <span className="whitespace-nowrap flex-shrink min-w-0">จำนวนนักเรียนนักศึกษาออกกลางคัน (ถ้ามี) ลาออก.......................คน</span>
                                                    <span className="whitespace-nowrap flex-shrink min-w-0">พักการเรียน.......................คน</span>
                                                    <span className="whitespace-nowrap flex-shrink min-w-0">อื่นๆ (.............................................)........... คน</span>
                                                </div>
                                                <div className="flex justify-around items-end pt-1 mb-4">
                                                    <div className="text-center flex flex-col items-center">
                                                        <div className="flex items-end">
                                                            <span className="mr-1">ลงชื่อ</span>
                                                            {dotLine()}
                                                            <span className="ml-1">ครูที่ปรึกษา</span>
                                                        </div>
                                                        <div className="mt-1">({selectedAdvisor.name})</div>
                                                    </div>
                                                    <div className="text-center flex flex-col items-center">
                                                        <div className="flex items-end">
                                                            <span className="mr-1">ลงชื่อ</span>
                                                            {dotLine()}
                                                            <span className="ml-1">ครูที่ปรึกษา</span>
                                                        </div>
                                                        <div className="mt-1">(........................................................)</div>
                                                    </div>
                                                </div>
                                                <div className="flex mt-2 px-1 font-normal">
                                                    <span className="font-bold mr-2 w-12 whitespace-nowrap">หมายเหตุ</span>
                                                    <div className="flex-1 whitespace-pre-wrap leading-tight">{reportRemarks || ""}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ===== EXISTING: PHOTOS ===== */}
                            {viewMode === "photos" && (
                                <>
                                    {reportPhotos.length > 0 ? (
                                        Array.from({ length: Math.ceil(reportPhotos.length / 6) }).map((_, pageIndex) => {
                                            const startIdx = pageIndex * 6;
                                            const pagePhotos = reportPhotos.slice(startIdx, startIdx + 6);
                                            return (
                                                <div key={pageIndex} className="w-[210mm] shrink-0 border border-gray-300 p-12 pb-10 bg-white shadow-lg relative min-h-[297mm]">
                                                    <div className="text-center mb-6 space-y-2">
                                                        <h2 className="text-base font-medium leading-tight">ภาพการจัดกิจกรรมโฮมรูม ของครู{selectedAdvisor.name} และนักเรียน นักศึกษา</h2>
                                                        <h3 className="text-sm font-normal">ภาคเรียนที่ {term}/{academicYear} วิทยาลัยอาชีวศึกษาสุโขทัย</h3>
                                                        {pageIndex > 0 && <p className="text-sm text-gray-600">(ต่อ)</p>}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-6 auto-rows-max flex-grow">
                                                        {pagePhotos.map((url, index) => (
                                                            <div key={startIdx + index} className="flex flex-col items-center">
                                                                <div className="aspect-[4/3] w-full bg-gray-100 border border-gray-300 overflow-hidden relative">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={url} alt={`Activity ${startIdx + index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="absolute bottom-4 left-0 right-0 text-center text-xl font-bold text-gray-800">"เรียนดี มีคุณธรรม"</div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 w-[210mm] shrink-0 bg-white border border-gray-200 shadow-lg mx-auto">
                                            <ImageIcon size={48} className="mb-2" />
                                            <p>ไม่พบรูปภาพกิจกรรม</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ===== NEW: แบบบันทึกให้คำปรึกษา (รายบุคคล) ===== */}
                            {viewMode === "counseling-form" && (
                                <div className="w-[210mm] shrink-0 border border-gray-300 p-10 pb-10 bg-white shadow-lg relative min-h-[297mm] text-[11px]">
                                    <div className="text-center font-bold text-[12px] mb-4">แบบบันทึกให้คำปรึกษานักเรียน นักศึกษา (รายบุคคล)</div>

                                    <div className="flex justify-end mb-3">
                                        <span>วันที่............เดือน.......................พ.ศ......................</span>
                                    </div>

                                    <div className="mb-2">
                                        <span>เริ่มเวลา.........................................................................</span>
                                    </div>
                                    <div className="font-semibold mb-1">ผู้ขอรับการปรึกษา</div>
                                    <div className="mb-1 flex gap-4">
                                        <span>ชื่อ................................สกุล...................................ชื่อเล่น..........................</span>
                                    </div>
                                    <div className="mb-3">
                                        <span>ระดับชั้น..............ปีที่.........ห้อง..........เบอร์โทรศัพท์........................................</span>
                                    </div>

                                    <div className="mb-2 font-semibold">การพิจารณารับคำปรึกษา</div>
                                    <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px]">
                                        <span>☐ สังเกตเห็นและเข้าไปช่วยเหลือเอง</span>
                                        <span>☐ ผู้รับการปรึกษามาด้วยตนเอง</span>
                                        <span>☐ ส่งต่อมาจาก..............</span>
                                    </div>
                                    <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px]">
                                        <span>☐ การพิจารณารับคำปรึกษาครั้งที่......</span>
                                        <span>☐ เป็นครั้งแรก</span>
                                        <span>☐ ต่อเนื่องเป็นครั้งที่......</span>
                                        <span>☐ ต่อเนื่องเป็นครั้งที่......</span>
                                    </div>

                                    <div className="mb-2 font-semibold">กรณีการให้คำปรึกษา</div>
                                    <div className="mb-4 grid grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                                        <span>☐ การเรียน</span>
                                        <span>☐ เพื่อน</span>
                                        <span>☐ ครอบครัว</span>
                                        <span>☐ สุขภาพ</span>
                                        <span>☐ การศึกษาต่อ</span>
                                        <span>☐ ความรัก</span>
                                        <span>☐ เศรษฐกิจ</span>
                                        <span></span>
                                        <span>☐ อาชีพ/ทางงานพิเศษ</span>
                                        <span>☐ อื่นๆ</span>
                                    </div>

                                    <div className="mb-1 font-semibold underline">ปัญหา/สาเหตุการขอรับการให้คำปรึกษา</div>
                                    {[1, 2, 3].map(i => <div key={i} className="border-b border-gray-400 mb-2 h-5" />)}

                                    <div className="mt-3 mb-1 font-semibold underline">การให้คำปรึกษา/แนะนำ/การช่วยเหลือ</div>
                                    {[1, 2, 3].map(i => <div key={i} className="border-b border-gray-400 mb-2 h-5" />)}

                                    <div className="mt-3 mb-1 font-semibold underline">ผลสรุปของการแก้ปัญหา</div>
                                    {[1, 2].map(i => <div key={i} className="border-b border-gray-400 mb-2 h-5" />)}

                                    <div className="mt-3 mb-1">วางแผน/การนัดหมายครั้งต่อไป วันที่...................................เวลา.........................</div>
                                    <div className="mb-3">การติดตามผล</div>
                                    {[1].map(i => <div key={i} className="border-b border-gray-400 mb-2 h-5" />)}

                                    <div className="mt-3 mb-4">การส่งต่อ (ถ้ามี)</div>
                                    {[1].map(i => <div key={i} className="border-b border-gray-400 mb-2 h-5" />)}

                                    <div className="mt-6 flex justify-around items-end">
                                        <div className="text-center">
                                            <div className="flex items-end gap-1">
                                                <span>ลงชื่อ..................................</span>
                                                <span>ผู้รับคำปรึกษา ลงชื่อ..................................</span>
                                                <span>ผู้ให้คำปรึกษา</span>
                                            </div>
                                            <div className="mt-1 flex justify-around">
                                                <span>(.......................................)</span>
                                                <span>(.......................................)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-0 right-0 text-center font-bold text-[13px]">"เรียนดี มีคุณธรรม"</div>
                                </div>
                            )}

                            {/* ===== NEW: รายงานการให้คำปรึกษา (ตาราง) ===== */}
                            {viewMode === "counseling-table" && (
                                <div className="w-[210mm] shrink-0 border border-gray-300 p-10 pb-10 bg-white shadow-lg relative min-h-[297mm] text-[11px]">
                                    <div className="text-center font-bold text-[12px] mb-1">รายงานการให้คำปรึกษานักเรียนนักศึกษา วิทยาลัยอาชีวศึกษาสุโขทัย</div>
                                    <div className="text-center text-[11px] mb-1">แนวทางการดูแลช่วยเหลือผู้เรียน ภาคเรียนที่ {term} ปีการศึกษา {academicYear}</div>
                                    <div className="text-[11px] mb-3">
                                        ระดับชั้น {selectedAdvisor?.classLevel || ''} ห้อง {selectedAdvisor?.room || ''} สาขาวิชา {selectedAdvisor?.department || ''}
                                    </div>

                                    <table className="w-full border-collapse border border-black text-[10px]">
                                        <thead>
                                            <tr>
                                                <th className="border border-black p-1 bg-gray-100 w-[6%] text-center">ลำดับ</th>
                                                <th className="border border-black p-1 bg-gray-100 w-[25%] text-center">ผู้รับคำปรึกษา</th>
                                                <th className="border border-black p-1 bg-gray-100 w-[35%] text-center">เรื่องที่ขอรับการปรึกษา</th>
                                                <th className="border border-black p-1 bg-gray-100 w-[12%] text-center">แก้ปัญหาสำเร็จ</th>
                                                <th className="border border-black p-1 bg-gray-100 w-[12%] text-center">มีการส่งต่อ</th>
                                                <th className="border border-black p-1 bg-gray-100 w-[10%] text-center">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <tr key={i} className="h-8">
                                                    <td className="border border-black p-1 text-center">{i + 1}</td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1 text-center"></td>
                                                    <td className="border border-black p-1 text-center"></td>
                                                    <td className="border border-black p-1"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="mt-6 flex justify-around items-end">
                                        <div className="text-center">
                                            <div className="flex items-end gap-1">ลงชื่อ{dotLine("w-28")}ครูที่ปรึกษา</div>
                                            <div className="mt-1">({selectedAdvisor.name})</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-end gap-1">ลงชื่อ{dotLine("w-28")}ครูที่ปรึกษา</div>
                                            <div className="mt-1">(.......................................)</div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-0 right-0 text-center font-bold text-[13px]">"เรียนดี มีคุณธรรม"</div>
                                </div>
                            )}

                            {/* ===== NEW: การติดตามนักเรียน ===== */}
                            {viewMode === "student-tracking" && (
                                <div className="w-[210mm] shrink-0 border border-gray-300 p-10 pb-10 bg-white shadow-lg relative min-h-[297mm] text-[11px]">
                                    <div className="text-center font-bold text-[12px] mb-3">การติดตามนักเรียน นักศึกษาที่ขาดเรียนบ่อย และนักเรียนที่ออกกลางคัน</div>

                                    <table className="w-full border-collapse border border-black text-[10px] mb-4">
                                        <thead>
                                            <tr>
                                                <th className="border border-black p-1 bg-gray-100 text-center w-[6%]" rowSpan={2}>ลำดับ</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center w-[30%]" rowSpan={2}>รายชื่อนักเรียน นักศึกษา</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center" colSpan={4}>สาเหตุออกกลางคัน</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center" colSpan={2}>การติดตาม</th>
                                            </tr>
                                            <tr>
                                                <th className="border border-black p-1 bg-gray-100 text-center text-[9px]">ลาออก</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center text-[9px]">พักการเรียน</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center text-[9px]">พ้นสภาพ</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center text-[9px]">ไม่มาเรียน (มีรายชื่อ)</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center text-[9px]">โทรศัพท์/Line</th>
                                                <th className="border border-black p-1 bg-gray-100 text-center text-[9px]">เยี่ยมบ้าน</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <tr key={i} className="h-8">
                                                    <td className="border border-black p-1 text-center">{i + 1}</td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="mb-2">การติดตาม สาเหตุที่ทำให้นักเรียนนักศึกษาออกกลางคัน.....................................................................................</div>
                                    {fullLine()}
                                    {fullLine()}

                                    <div className="mt-6 flex justify-around items-end">
                                        <div className="text-center">
                                            <div className="flex items-end gap-1">ลงชื่อ{dotLine("w-28")}ครูที่ปรึกษา</div>
                                            <div className="mt-1">({selectedAdvisor.name})</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-end gap-1">ลงชื่อ{dotLine("w-28")}ครูที่ปรึกษา</div>
                                            <div className="mt-1">(.......................................)</div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-0 right-0 text-center font-bold text-[13px]">"เรียนดี มีคุณธรรม"</div>
                                </div>
                            )}

                            {/* ===== NEW: สรุปปัญหา/ข้อเสนอแนะ ===== */}
                            {viewMode === "summary-form" && (
                                <div className="w-[210mm] shrink-0 border border-gray-300 p-10 pb-10 bg-white shadow-lg relative min-h-[297mm] text-[11px]">
                                    <div className="text-center font-bold text-[12px] mb-1">สรุปปัญหาของนักเรียน และข้อเสนอแนะในการจัดกิจกรรมโฮมรูม</div>
                                    <div className="text-center text-[11px] mb-1">ภาคเรียนที่ {term} ปีการศึกษา {academicYear}</div>
                                    <div className="text-center text-[11px] mb-1">ระดับชั้น {selectedAdvisor?.classLevel || ''} ห้อง {selectedAdvisor?.room || ''} สาขาวิชา {selectedAdvisor?.department || ''}</div>
                                    <div className="text-center text-[11px] mb-4">วิทยาลัยอาชีวศึกษาสุโขทัย</div>

                                    <div className="mb-3">
                                        <div className="font-semibold mb-2">1. ปัญหาของนักเรียน ในการจัดกิจกรรม</div>
                                        {[1, 2, 3, 4].map(i => <div key={i} className="border-b border-gray-400 mb-3 h-5" />)}
                                    </div>

                                    <div className="mb-3 mt-5">
                                        <div className="font-semibold mb-2">2. แนวทางการแก้ไขปัญหาของครูที่ปรึกษา</div>
                                        {[1, 2, 3, 4].map(i => <div key={i} className="border-b border-gray-400 mb-3 h-5" />)}
                                    </div>

                                    <div className="mb-3 mt-5">
                                        <div className="font-semibold mb-2">3. ข้อเสนอแนะ</div>
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-b border-gray-400 mb-3 h-5" />)}
                                    </div>

                                    <div className="mt-8 grid grid-cols-2 gap-8">
                                        <div className="text-center">
                                            <div className="flex items-end justify-center gap-1 mb-1">ลงชื่อ{dotLine("w-24")}ครูที่ปรึกษา</div>
                                            <div>({selectedAdvisor.name})</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-end justify-center gap-1 mb-1">ลงชื่อ{dotLine("w-24")}ครูที่ปรึกษา</div>
                                            <div>(.......................................)</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-end justify-center gap-1 mb-1">ลงชื่อ{dotLine("w-24")}หัวหน้าแผนกวิชา</div>
                                            <div>(.......................................)</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-end justify-center gap-1 mb-1">ลงชื่อ{dotLine("w-24")}หัวหน้างานครูที่ปรึกษา</div>
                                            <div>(.......................................)</div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-0 right-0 text-center font-bold text-[13px]">"เรียนดี มีคุณธรรม"</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

