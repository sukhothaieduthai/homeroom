"use client";

import { useState, useEffect } from "react";
import { HomeroomReport, Advisor } from "@/lib/google-sheets";
import { getReportsAction } from "@/app/actions";
import AdvisorSelector from "./AdvisorSelector";
import { DownloadIcon, FileTextIcon, TableIcon, ImageIcon } from "lucide-react";

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
            r.advisorName === selectedAdvisor.name
        );
        setFilteredReports(rigorousFiltered);

        // Extract photos
        const photos: string[] = [];
        rigorousFiltered.forEach(r => {
            if (r.photoUrl) {
                // Split by comma if multiple, trim whitespace
                r.photoUrl.split(',').forEach(url => {
                    if (url.trim()) photos.push(url.trim());
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

    const getImageDataUrl = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg'));
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.onerror = reject;
            img.src = url;
        });
    };

    const handleExport = async () => {
        if (!selectedAdvisor) return alert("กรุณาเลือกครูที่ปรึกษา");

        setIsGenerating(true);
        try {
            // 1. Prepare Photos as Base64 (for Puppeteer to render locally)
            const photoDataUrls = [];
            if (reportPhotos.length > 0 && (viewMode === 'photos' || viewMode === 'cover')) {
                // Actually logic should be: if mode is 'table', we don't need photos. 
                // But let's just send them if they exist, or optimize based on viewMode.
                // Optimization: Only convert if mode includes photos (all or photos)
            }

            // Optimization: Load photos only if needed
            let photosToSend: string[] = [];
            if (viewMode === 'photos' || viewMode === 'cover' /* Cover doesn't need photos, but 'all' logic usually handled by API if I passed 'all' */) {
                // Wait. context-aware means if viewMode is 'photos', download photos.
                // But user might want 'all' somewhere?
                // The current UI only downloads the CURRENT viewMode.
            }

            // Re-eval: The user requested "Download what I see".

            if (viewMode === 'photos') {
                if (reportPhotos.length === 0) {
                    alert("ไม่พบรูปภาพ");
                    setIsGenerating(false);
                    return;
                }
                // Convert all photos
                try {
                    photosToSend = await Promise.all(reportPhotos.map(url => getImageDataUrl(url)));
                } catch (e) {
                    console.error("Image conversation failed", e);
                    // Continue without photos or alert?
                    // Let's try to continue or ensure at least some work.
                }
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

            {/* View Navigation Tabs */}
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

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <AdvisorSelector year={Number(academicYear)} onAdvisorSelect={handleAdvisorSelect} />
            </div>

            {/* Action Bar (Download) */}
            <div className="flex justify-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                <button
                    onClick={handleExport}
                    disabled={!selectedAdvisor || isGenerating}
                    className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg font-bold text-lg"
                >
                    <DownloadIcon size={24} />
                    {getButtonLabel()}
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
                            <div className="w-full">
                                <h2 className="text-2xl font-bold text-center mb-6">แบบบันทึกกิจกรรมโฮมรูม</h2>
                                <div className="mb-4 text-base flex justify-between px-4">
                                    <div>
                                        <p><strong>ระดับชั้น:</strong> {selectedAdvisor.classLevel}</p>
                                        <p><strong>สาขาวิชา:</strong> {selectedAdvisor.department}</p>
                                    </div>
                                    <div className="text-right">
                                        <p><strong>ห้อง:</strong> {selectedAdvisor.room}</p>
                                        <p><strong>ครูที่ปรึกษา:</strong> {selectedAdvisor.name}</p>
                                    </div>
                                </div>
                                <table className="w-full border-collapse border border-black text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-center">
                                            <th className="border border-black p-3 w-[20%]" rowSpan={2}>สัปดาห์ที่/วัน/เวลา<br />สถานที่อบรม</th>
                                            <th className="border border-black p-3" rowSpan={2}>เรื่อง/กิจกรรม/แนวทาง/เจ้าหน้าที่</th>
                                            <th className="border border-black p-3" colSpan={3}>ข้อมูลนักเรียน/นักศึกษา</th>
                                        </tr>
                                        <tr className="bg-gray-100 text-center">
                                            <th className="border border-black p-2 w-[8%]">จำนวน</th>
                                            <th className="border border-black p-2 w-[8%]">มา</th>
                                            <th className="border border-black p-2 w-[8%]">ขาด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredReports.length > 0 ? filteredReports.map(r => (
                                            <tr key={r.id}>
                                                <td className="border border-black p-2 text-sm align-top">
                                                    <div className="font-medium">สัปดาห์ที่ {r.week}</div>
                                                    <div className="text-xs text-gray-700 mt-1">{r.date}</div>
                                                    <div className="text-xs text-gray-600 mt-1">เวลา 13.00-14.00 น.</div>
                                                </td>
                                                <td className="border border-black p-2 align-top">{r.topic}</td>
                                                <td className="border border-black p-2 text-center align-top">{r.totalStudents}</td>
                                                <td className="border border-black p-2 text-center align-top">{r.presentStudents}</td>
                                                <td className="border border-black p-2 text-center align-top">{r.absentStudents}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="border border-black p-4 text-center text-gray-500">ไม่พบรายงาน</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {viewMode === "photos" && (
                            <div className="w-full h-full">
                                <h2 className="text-2xl font-bold text-center mb-2">ภาพการจัดกิจกรรมโฮมรูม</h2>
                                <h3 className="text-lg font-medium text-center mb-8">ภาคเรียนที่ {term}/{academicYear} วิทยาลัยอาชีวศึกษาสุโขทัย</h3>

                                {reportPhotos.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-8 auto-rows-max p-4">
                                        {reportPhotos.map((url, index) => (
                                            <div key={index} className="flex flex-col items-center">
                                                <div className="aspect-[4/3] w-full bg-gray-100 border border-gray-300 rounded-md overflow-hidden relative shadow-sm">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={url}
                                                        alt={`Activity ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <p className="mt-2 text-gray-600 font-medium">รูปที่ {index + 1}</p>
                                            </div>
                                        ))}
                                    </div>
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
