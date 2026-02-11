"use client";

import { useState, useEffect } from "react";
import { HomeroomReport, Advisor } from "@/lib/google-sheets";
import { getReportsAction } from "@/app/actions";
import AdvisorSelector from "./AdvisorSelector";
import { DownloadIcon, FileTextIcon, TableIcon, ImageIcon } from "lucide-react";
import { convertToDriveDirectUrl } from "@/lib/drive-utils";

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
    const [isGenerating, setIsGenerating] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<"cover" | "table" | "photos">("cover");

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
                console.log("Original photoUrl from DB:", r.photoUrl);
                // Split by comma if multiple, trim whitespace, and convert to direct URLs
                r.photoUrl.split(',').forEach(url => {
                    const trimmedUrl = url.trim();
                    if (trimmedUrl) {
                        const convertedUrl = convertToDriveDirectUrl(trimmedUrl);
                        console.log("Converted URL:", convertedUrl);
                        photos.push(convertedUrl);
                    }
                });
            }
        });
        console.log("Total photos found:", photos.length);
        console.log("Photo URLs:", photos);
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
            // Prepare photo URLs (no conversion needed, pass URLs directly)
            let photosToSend: string[] = [];

            if (viewMode === 'photos') {
                if (reportPhotos.length === 0) {
                    alert("ไม่พบรูปภาพ");
                    setIsGenerating(false);
                    return;
                }
                // Pass URLs directly (no base64 conversion to avoid CORS)
                photosToSend = reportPhotos;
            }

            // 2. Prepare Payload
            const payload = {
                mode: viewMode, // 'cover', 'table', or 'photos'
                data: {
                    term,
                    academicYear,
                    advisor: selectedAdvisor,
                    reports: filteredReports,
                    photos: photosToSend
                }
            };

            // 3. Call API
            const response = await fetch('/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to generate PDF");

            // 4. Download Blob
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

    const getButtonLabel = () => {
        if (isGenerating) return "กำลังสร้าง PDF...";
        if (viewMode === 'cover') return "Download (หน้าปก)";
        if (viewMode === 'table') return "Download (ตาราง)";
        if (viewMode === 'photos') return "Download (รูปภาพ)";
        return "Download PDF";
    };

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


            {/* Action Bar (Download) - Top */}
            {selectedAdvisor && (
                <div className="flex justify-end">
                    <button
                        onClick={handleExport}
                        disabled={isGenerating || filteredReports.length === 0}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all font-semibold shadow-md"
                    >
                        <DownloadIcon size={20} />
                        {isGenerating ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
                    </button>
                </div>
            )}

            {/* View Tabs */}
            <div className="flex gap-2 w-full overflow-x-auto pb-2">
                <button
                    onClick={() => setViewMode("cover")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all border ${viewMode === "cover" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                    <FileTextIcon size={20} /> หน้าปก
                </button>
                <button
                    onClick={() => setViewMode("table")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all border ${viewMode === "table" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                    <TableIcon size={20} /> ตาราง
                </button>
                <button
                    onClick={() => setViewMode("photos")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all border ${viewMode === "photos" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                    <ImageIcon size={20} /> รูปภาพ
                </button>
            </div>



            {/* View Content */}
            <div className="bg-white border text-gray-900 border-gray-200 shadow-sm rounded-lg min-h-[500px] p-8 flex justify-center bg-gray-50">
                {!selectedAdvisor ? (
                    <div className="text-gray-400 flex flex-col items-center justify-center">
                        <p>กรุณาเลือก ครูที่ปรึกษา เพื่อแสดงรายงาน</p>
                    </div>
                ) : (
                    <div className="w-full max-w-[210mm] border border-gray-300 p-12 bg-white shadow-lg relative aspect-[210/297] overflow-y-auto">

                        {viewMode === "cover" && (
                            <div className="flex flex-col items-center justify-between h-full text-center">
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

                                <div className="space-y-2 text-base text-gray-600 mb-10">
                                    <p className="font-semibold text-lg">วิทยาลัยอาชีวศึกษาสุโขทัย สถาบันการอาชีวศึกษาภาคเหนือ 3</p>
                                    <p>สำนักงานอาชีวศึกษาจังหวัดสุโขทัย</p>
                                    <p>สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ</p>
                                </div>
                            </div>
                        )}

                        {viewMode === "table" && (
                            <div className="w-full max-w-4xl mx-auto">
                                {/* Header Section - Logo Left, Text Center */}
                                <div className="flex items-start mb-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src="/sukhothailogo.png"
                                        alt="Logo"
                                        className="w-20 h-20 mr-4 flex-shrink-0"
                                    />
                                    <div className="flex-1 text-center pt-1">
                                        <h1 className="text-base font-bold leading-tight">แบบบันทึกกิจกรรมโฮมรูม ภาคเรียนที่ {term}/{academicYear}</h1>
                                        <p className="text-sm mt-0.5">วิทยาลัยอาชีวศึกษาสุโขทัย</p>
                                    </div>
                                </div>

                                {/* Class Info - Single Line */}
                                <div className="text-xs mb-1">
                                    <span className="font-normal">ระดับชั้น</span> {selectedAdvisor.classLevel}
                                    {'   '}
                                    <span className="font-normal">สาขาวิชา</span> {selectedAdvisor.department}
                                    {'   '}
                                    <span className="font-normal">ห้อง</span> {selectedAdvisor.room}
                                </div>

                                {/* Advisor Info */}
                                <div className="text-xs mb-3">
                                    <span className="font-normal">ครูที่ปรึกษา</span> {selectedAdvisor.name}
                                </div>
                                {/* Table */}
                                <table className="w-full border-collapse border border-black">
                                    <thead>
                                        <tr>
                                            <th className="border border-black p-2 text-xs font-medium bg-gray-100" rowSpan={2}>
                                                สัปดาห์ที่<br />วัน/เวลา<br />สถานที่อบรม
                                            </th>
                                            <th className="border border-black p-2 text-xs font-medium bg-gray-100" rowSpan={2}>
                                                เรื่อง/กิจกรรม/แนวทาง/เจ้าหน้าที่
                                            </th>
                                            <th className="border border-black p-2 text-xs font-medium bg-gray-100" colSpan={3}>
                                                ข้อมูลนักเรียน/นักศึกษา
                                            </th>
                                        </tr>
                                        <tr>
                                            <th className="border border-black p-1 text-xs font-medium bg-gray-100 w-16">จำนวน</th>
                                            <th className="border border-black p-1 text-xs font-medium bg-gray-100 w-16">มา</th>
                                            <th className="border border-black p-1 text-xs font-medium bg-gray-100 w-16">ขาด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredReports.length > 0 ? filteredReports.map((r, idx) => (
                                            <tr key={r.id}>
                                                <td className="border border-black p-2 align-top text-[10px]">
                                                    <div className="text-blue-700 font-medium">สัปดาห์ที่ {r.week} ({r.date})</div>
                                                    <div className="text-gray-600 mt-0.5">เวลา 13.00-14.00 น.</div>
                                                </td>
                                                <td className="border border-black p-2 align-top text-[10px] leading-relaxed">
                                                    {r.topic}
                                                </td>
                                                <td className="border border-black p-1 text-center text-[10px]">{r.totalStudents}</td>
                                                <td className="border border-black p-1 text-center text-[10px]">{r.presentStudents}</td>
                                                <td className="border border-black p-1 text-center text-[10px]">{r.absentStudents}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="border border-black p-6 text-center text-gray-500">
                                                    ไม่พบรายงาน
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {viewMode === "photos" && (
                            <div className="w-full h-full space-y-8">
                                {reportPhotos.length > 0 ? (
                                    // Paginate: 6 photos per page
                                    Array.from({ length: Math.ceil(reportPhotos.length / 6) }).map((_, pageIndex) => {
                                        const startIdx = pageIndex * 6;
                                        const pagePhotos = reportPhotos.slice(startIdx, startIdx + 6);

                                        return (
                                            <div key={pageIndex} className="page-break-after">
                                                {/* Header Section (repeated for each page) */}
                                                <div className="text-center mb-6 space-y-2">
                                                    <h2 className="text-base font-medium leading-tight">
                                                        ภาพการจัดกิจกรรมโฮมรูม ของครู{selectedAdvisor.name} และนักเรียน นักศึกษา
                                                    </h2>
                                                    <h3 className="text-sm font-normal">
                                                        ภาคเรียนที่ {term}/{academicYear} วิทยาลัยอาชีวศึกษาสุโขทัย
                                                    </h3>
                                                    {pageIndex > 0 && (
                                                        <p className="text-sm text-gray-600">(ต่อ)</p>
                                                    )}
                                                </div>

                                                {/* Photo Grid */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-6 auto-rows-max">
                                                    {pagePhotos.map((url, index) => (
                                                        <div key={startIdx + index} className="flex flex-col items-center">
                                                            <div className="aspect-[4/3] w-full bg-gray-100 border border-gray-300 overflow-hidden relative">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={url}
                                                                    alt={`Activity ${startIdx + index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                    referrerPolicy="no-referrer"
                                                                    crossOrigin="anonymous"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <ImageIcon size={48} className="mb-2" />
                                        <p>ไม่พบรูปภาพกิจกรรม</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
