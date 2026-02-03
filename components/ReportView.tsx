"use client";

import { useState, useEffect } from "react";
import { HomeroomReport } from "@/lib/google-sheets";
import { getReportsAction } from "@/app/actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DownloadIcon } from "lucide-react";

export default function ReportView() {
    const [reports, setReports] = useState<HomeroomReport[]>([]);

    useEffect(() => {
        async function fetchReports() {
            const data = await getReportsAction();
            setReports(data);
        }
        fetchReports();
    }, []);

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.text("Homeroom Report", 14, 20);

        // ส่วนของ PDF คงเดิมตามที่แจ้ง (ยังไม่เพิ่ม Term/Year)
        const tableData = reports.map(r => [
            r.date,
            r.week,
            r.advisorName,
            r.classLevel + " " + r.room,
            r.topic,
            `${r.presentStudents}/${r.totalStudents}`
        ]);

        autoTable(doc, {
            head: [['Date', 'Week', 'Advisor', 'Class', 'Topic', 'Present/Total']],
            body: tableData,
            startY: 30,
        });

        doc.save("homeroom-report.pdf");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">รายงานสรุปผล</h2>
                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                    <DownloadIcon size={18} />
                    Export PDF
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
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                    No reports found
                                </td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr key={report.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.term}/{report.academicYear}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.week}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{report.advisorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.classLevel}/{report.room}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left truncate max-w-xs">{report.topic}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        <span className="text-green-600 font-medium">{report.presentStudents}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span>{report.totalStudents}</span>
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