"use client";

import { useState, useEffect } from "react";
import { HomeroomReport } from "@/lib/google-sheets";
import { getReportsAction } from "@/app/actions";
import { DownloadIcon, Image as ImageIcon, Filter } from "lucide-react";

export default function ReportView() {
    const [reports, setReports] = useState<HomeroomReport[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string>("all");

    useEffect(() => {
        async function fetchReports() {
            const data = await getReportsAction();

            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setReports(data);
        }
        fetchReports();
    }, []);

    const availableTerms = Array.from(new Set(reports.map(r => `${r.term}/${r.academicYear}`))).sort();

    const filteredReports = selectedTerm === "all"
        ? reports
        : reports.filter(r => `${r.term}/${r.academicYear}` === selectedTerm);

    const handleExportPDF = async () => {
        try {
            const payload = {
                mode: 'summary',
                data: {
                    term: selectedTerm === "all" ? "All" : selectedTerm.split('/')[0],
                    academicYear: selectedTerm === "all" ? "" : selectedTerm.split('/')[1],
                    reports: filteredReports,
                    photos: [] // Summary doesn't need photos
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
            a.download = `homeroom-summary-${selectedTerm === "all" ? "all" : selectedTerm.replace('/', '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Export failed", error);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-xl font-semibold text-gray-800 whitespace-nowrap">สรุปรายงาน</h2>

                    <div className="relative flex items-center">
                        <Filter className="absolute left-3 text-black" size={16} />
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-400 rounded-md bg-white text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer hover:bg-gray-50"
                        >
                            <option value="all">ดูทั้งหมด</option>
                            <option disabled>──────────</option>
                            {availableTerms.map(term => (
                                <option key={term} value={term}>ภาคเรียนที่ {term}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors w-full md:w-auto justify-center"
                >
                    <DownloadIcon size={18} />
                    Export PDF ({selectedTerm === "all" ? "All" : selectedTerm})
                </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advisor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Picture</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredReports.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <p>ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredReports.map((report) => (
                                <tr key={report.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.term}/{report.academicYear}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.week}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{report.advisorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left truncate max-w-[150px]" title={report.department}>
                                        {report.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.classLevel}/{report.room}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left truncate max-w-xs">{report.topic}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        <span className="text-green-600 font-medium">{report.presentStudents}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span>{report.totalStudents}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold text-center">
                                        {report.absentStudents}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        {report.photoUrl ? (
                                            <a
                                                href={report.photoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                <ImageIcon size={16} />
                                                View
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}